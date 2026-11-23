import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../src/app.js';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  // PI2 CI diagnostic: allow enough time for MongoDB binaries to start on slower GitHub runners.
  mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 60_000 } });
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  // PI2 CI diagnostic: avoid masking the original setup failure if MongoDB never started.
  if (mongo) await mongo.stop();
});

test('GET /health returns ok', async () => {
  await request(app).get('/health').expect(200, { status: 'ok' });
});

test('GET /ready returns connected while MongoDB is connected', async () => {
  await request(app).get('/ready').expect(200, { status: 'ready', database: 'connected' });
});
