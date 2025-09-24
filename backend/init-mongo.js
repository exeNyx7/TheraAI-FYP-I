// MongoDB initialization script
db = db.getSiblingDB('theraai');

// Create collections
db.createCollection('users');
db.createCollection('therapy_sessions');
db.createCollection('conversations');
db.createCollection('progress_tracking');

// Create indexes
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "username": 1 }, { unique: true });
db.therapy_sessions.createIndex({ "user_id": 1 });
db.therapy_sessions.createIndex({ "created_at": 1 });
db.conversations.createIndex({ "session_id": 1 });
db.conversations.createIndex({ "timestamp": 1 });
db.progress_tracking.createIndex({ "user_id": 1 });

print('Database initialized successfully!');