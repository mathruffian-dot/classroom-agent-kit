#!/usr/bin/env node
const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');

// Scopes required for Google Classroom
const SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.rosters.readonly',
  'https://www.googleapis.com/auth/classroom.announcements',
  'https://www.googleapis.com/auth/classroom.coursework.me',
  'https://www.googleapis.com/auth/classroom.coursework.students'
];

// Paths
const TOKEN_PATH = path.join(__dirname, 'token.json');
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAuth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  // Check if credentials.json exists
  try {
    await fs.access(CREDENTIALS_PATH);
  } catch (e) {
    console.error(`Error: 'credentials.json' is missing in: ${__dirname}`);
    console.error('Please download your Desktop application credential JSON and place it in the folder.');
    process.exit(1);
  }
  
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/**
 * Main execution blocks
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help') {
    printHelp();
    return;
  }

  try {
    const auth = await authorize();
    const classroom = google.classroom({version: 'v1', auth});

    switch (command) {
      case 'auth':
        console.log('Authentication successful! token.json has been generated.');
        break;

      case 'list-courses':
        await listCourses(classroom);
        break;

      case 'list-students':
        const courseId = args[1];
        if (!courseId) {
          console.error('Error: Please provide a courseId. Usage: node classroom-cli.js list-students <courseId>');
          process.exit(1);
        }
        await listStudents(classroom, courseId);
        break;

      case 'post-announcement':
        const targetCourseId = args[1];
        const text = args[2];
        if (!targetCourseId || !text) {
          console.error('Error: Missing parameters. Usage: node classroom-cli.js post-announcement <courseId> <text>');
          process.exit(1);
        }
        await postAnnouncement(classroom, targetCourseId, text);
        break;

      case 'list-coursework':
        const cwCourseId = args[1];
        if (!cwCourseId) {
          console.error('Error: Please provide a courseId. Usage: node classroom-cli.js list-coursework <courseId>');
          process.exit(1);
        }
        await listCourseWork(classroom, cwCourseId);
        break;

      case 'create-assignment':
        const assignCourseId = args[1];
        const title = args[2];
        const description = args[3] || '';
        const materialsList = args.slice(4);
        if (!assignCourseId || !title) {
          console.error('Error: Missing parameters. Usage: node classroom-cli.js create-assignment <courseId> <title> [description] [link1] [link2] ...');
          process.exit(1);
        }
        await createAssignment(classroom, assignCourseId, title, description, materialsList);
        break;

      case 'update-assignment':
        const updateCourseId = args[1];
        const updateId = args[2];
        const updateTitle = args[3];
        const updateDesc = args[4] || '';
        if (!updateCourseId || !updateId || !updateTitle) {
          console.error('Error: Missing parameters. Usage: node classroom-cli.js update-assignment <courseId> <assignmentId> <title> [description]');
          process.exit(1);
        }
        await updateAssignment(classroom, updateCourseId, updateId, updateTitle, updateDesc);
        break;

      case 'delete-assignment':
        const delCourseId = args[1];
        const delId = args[2];
        if (!delCourseId || !delId) {
          console.error('Error: Missing parameters. Usage: node classroom-cli.js delete-assignment <courseId> <assignmentId>');
          process.exit(1);
        }
        await deleteAssignment(classroom, delCourseId, delId);
        break;

      default:
        console.log(`Unknown command: '${command}'`);
        printHelp();
    }
  } catch (e) {
    console.error('Execution Error:', e.message);
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
Google Classroom CLI Tool
Usage:
  node classroom-cli.js auth                          Authenticate and generate token
  node classroom-cli.js list-courses                  List active courses
  node classroom-cli.js list-students <courseId>      List students in a course
  node classroom-cli.js post-announcement <courseId> <text>  Post announcement to course stream
  node classroom-cli.js list-coursework <courseId>    List assignments for a course
  node classroom-cli.js create-assignment <courseId> <title> [description] [link1] [link2] ...  Create a course assignment with attachments
  node classroom-cli.js update-assignment <courseId> <assignmentId> <title> [description]      Update an assignment title/description
  node classroom-cli.js delete-assignment <courseId> <assignmentId>                            Delete an assignment
  `);
}

async function listCourses(classroom) {
  const res = await classroom.courses.list({
    courseStates: 'ACTIVE',
  });
  const courses = res.data.courses;
  if (!courses || courses.length === 0) {
    console.log('No active courses found.');
    return;
  }
  console.log(JSON.stringify(courses.map(c => ({
    id: c.id,
    name: c.name,
    section: c.section,
    alternateLink: c.alternateLink
  })), null, 2));
}

async function listStudents(classroom, courseId) {
  const res = await classroom.courses.students.list({
    courseId: courseId,
  });
  const students = res.data.students;
  if (!students || students.length === 0) {
    console.log('No students found in this course.');
    return;
  }
  console.log(JSON.stringify(students.map(s => ({
    userId: s.userId,
    name: s.profile.name.fullName,
    email: s.profile.emailAddress
  })), null, 2));
}

async function postAnnouncement(classroom, courseId, text) {
  const res = await classroom.courses.announcements.create({
    courseId: courseId,
    requestBody: {
      text: text,
      state: 'PUBLISHED'
    }
  });
  console.log(`Announcement created successfully! Link: ${res.data.alternateLink}`);
}

async function listCourseWork(classroom, courseId) {
  const res = await classroom.courses.courseWork.list({
    courseId: courseId,
  });
  const courseWork = res.data.courseWork;
  if (!courseWork || courseWork.length === 0) {
    console.log('No coursework found in this course.');
    return;
  }
  console.log(JSON.stringify(courseWork.map(cw => ({
    id: cw.id,
    title: cw.title,
    state: cw.state,
    alternateLink: cw.alternateLink
  })), null, 2));
}

async function createAssignment(classroom, courseId, title, description, materialsList = []) {
  const materials = materialsList.map(url => ({
    link: {
      url: url
    }
  }));

  const res = await classroom.courses.courseWork.create({
    courseId: courseId,
    requestBody: {
      title: title,
      description: description,
      workType: 'ASSIGNMENT',
      state: 'PUBLISHED',
      materials: materials.length > 0 ? materials : undefined
    }
  });
  console.log(`Assignment created successfully! Link: ${res.data.alternateLink}`);
}

async function updateAssignment(classroom, courseId, id, title, description) {
  const updateMasks = [];
  const requestBody = {};
  if (title) {
    requestBody.title = title;
    updateMasks.push('title');
  }
  if (description) {
    requestBody.description = description;
    updateMasks.push('description');
  }

  const res = await classroom.courses.courseWork.patch({
    courseId: courseId,
    id: id,
    updateMask: updateMasks.join(','),
    requestBody: requestBody
  });
  console.log(`Assignment updated successfully! Link: ${res.data.alternateLink}`);
}

async function deleteAssignment(classroom, courseId, id) {
  await classroom.courses.courseWork.delete({
    courseId: courseId,
    id: id
  });
  console.log(`Assignment ${id} deleted successfully.`);
}

main();
