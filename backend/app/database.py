"""
Database Configuration and Connection Management for TheraAI
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional
from datetime import datetime, timezone
from .config import get_settings

settings = get_settings()


class DatabaseManager:
    """Database connection manager"""
    
    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.database: Optional[AsyncIOMotorDatabase] = None
    
    async def connect_to_database(self):
        """Create database connection"""
        try:
            self.client = AsyncIOMotorClient(settings.mongodb_url)
            self.database = self.client[settings.mongodb_database]
            
            # Test the connection
            await self.client.admin.command('ping')
            print(f"✅ Connected to MongoDB database: {settings.mongodb_database}")
            
        except Exception as e:
            print(f"❌ Failed to connect to MongoDB: {e}")
            raise e
    
    async def close_database_connection(self):
        """Close database connection"""
        if self.client:
            self.client.close()
            print("✅ Disconnected from MongoDB")
    
    def get_database(self) -> AsyncIOMotorDatabase:
        """Get database instance"""
        if self.database is None:
            raise RuntimeError("Database not connected. Call connect_to_database() first.")
        return self.database


# Global database manager instance
db_manager = DatabaseManager()


async def get_database() -> AsyncIOMotorDatabase:
    """Dependency function to get database instance"""
    return db_manager.get_database()


# Database collections
async def get_users_collection():
    """Get users collection"""
    db = await get_database()
    return db.users


async def get_journals_collection():
    """Get journals collection"""
    db = await get_database()
    return db.journals


async def get_appointments_collection():
    """Get appointments collection"""
    db = await get_database()
    return db.appointments


async def get_crisis_events_collection():
    """Get crisis events collection"""
    db = await get_database()
    return db.crisis_events


async def get_device_tokens_collection():
    """Get device tokens collection"""
    db = await get_database()
    return db.device_tokens


async def init_database():
    """Initialize database with indexes and constraints"""
    try:
        db = await get_database()
        
        # Create indexes for users collection
        users_collection = db.users
        
        # Email index (unique)
        await users_collection.create_index("email", unique=True)
        
        # Role index for filtering
        await users_collection.create_index("role")
        
        # Active status index
        await users_collection.create_index("is_active")
        
        # Created at index for sorting
        await users_collection.create_index("created_at")
        
        # Compound index for email + role
        await users_collection.create_index([("email", 1), ("role", 1)])
        
        # Create indexes for journals collection
        journals_collection = db.journals
        
        # Compound index for user_id + created_at (for efficient user queries sorted by date)
        await journals_collection.create_index([("user_id", 1), ("created_at", -1)])
        
        # Index on user_id for filtering
        await journals_collection.create_index("user_id")
        
        # Index on mood for statistics
        await journals_collection.create_index("mood")
        
        # Index on sentiment_label for statistics
        await journals_collection.create_index("sentiment_label")
        
        # Index on created_at for sorting
        await journals_collection.create_index("created_at")
        
        # Create indexes for appointments collection
        appointments_collection = db.appointments
        await appointments_collection.create_index([("therapist_id", 1), ("scheduled_at", -1)])
        await appointments_collection.create_index("patient_id")
        await appointments_collection.create_index("status")
        await appointments_collection.create_index([("scheduled_at", 1), ("reminder_sent", 1)])

        # Create indexes for crisis_events collection
        crisis_collection = db.crisis_events
        await crisis_collection.create_index("patient_id")
        await crisis_collection.create_index("acknowledged")
        await crisis_collection.create_index("created_at")

        # Create indexes for device_tokens collection
        device_tokens_collection = db.device_tokens
        await device_tokens_collection.create_index([("user_id", 1), ("token", 1)], unique=True)
        await device_tokens_collection.create_index("user_id")

        print("✅ Database indexes created successfully (users + journals + appointments + crisis_events + device_tokens)")

    except Exception as e:
        print(f"❌ Failed to initialize database: {e}")
        raise e


async def check_database_health() -> dict:
    """Check database health and connection status"""
    try:
        db = await get_database()
        
        # Ping database
        await db_manager.client.admin.command('ping')
        
        # Get server info
        server_info = await db_manager.client.server_info()
        
        # Count users and journals to check table availability (avoiding returning the counts publicly to prevent infra scraping)
        await db.users.count_documents({})
        await db.journals.count_documents({})
        
        return {
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": "Database connection failed"
        }