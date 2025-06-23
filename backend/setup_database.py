#!/usr/bin/env python3
"""
Complete database setup script for Chemical Inventory System
"""
import os
import sys
import subprocess
from pathlib import Path

def check_environment():
    """Check if environment is properly set up"""
    print("🔍 Checking environment setup...")
    
    # Check if .env file exists
    env_file = Path(".env")
    if not env_file.exists():
        print("❌ .env file not found!")
        print("💡 Please create .env file with DATABASE_URL and GOOGLE_APPLICATION_CREDENTIALS")
        return False
    
    # Check if Firebase JSON file exists
    firebase_file = Path("blossomsaroma-c660f-firebase-adminsdk-fbsvc-3ffdd1357f.json")
    if not firebase_file.exists():
        print("❌ Firebase JSON file not found!")
        print("💡 Please ensure the Firebase service account JSON file is in the backend directory")
        return False
    
    print("✅ Environment files found")
    return True

def install_dependencies():
    """Install required dependencies"""
    print("\n📦 Installing dependencies...")
    
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], 
                      check=True, capture_output=True, text=True)
        print("✅ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Error installing dependencies: {e}")
        return False

def run_admin_setup():
    """Run the admin setup script"""
    print("\n👑 Setting up admin user...")
    
    try:
        result = subprocess.run([sys.executable, "scripts/create_admin.py"], 
                              check=True, capture_output=True, text=True)
        print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Error setting up admin: {e}")
        print(f"Error output: {e.stderr}")
        return False

def verify_database():
    """Verify database setup"""
    print("\n🔍 Verifying database setup...")
    
    try:
        result = subprocess.run([sys.executable, "scripts/verify_database.py"], 
                              check=True, capture_output=True, text=True)
        print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Error verifying database: {e}")
        print(f"Error output: {e.stderr}")
        return False

def start_server():
    """Start the FastAPI server"""
    print("\n🚀 Starting FastAPI server...")
    print("💡 The server will start and create database tables automatically")
    print("💡 Press Ctrl+C to stop the server")
    
    try:
        subprocess.run([sys.executable, "-m", "uvicorn", "app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"])
    except KeyboardInterrupt:
        print("\n✅ Server stopped")

def main():
    """Main setup function"""
    print("🚀 Chemical Inventory - Complete Database Setup")
    print("=" * 60)
    
    # Check environment
    if not check_environment():
        print("\n❌ Environment not properly configured")
        print("💡 Please ensure .env and Firebase JSON files are present")
        return
    
    # Install dependencies
    if not install_dependencies():
        print("\n❌ Failed to install dependencies")
        return
    
    # Create scripts directory if it doesn't exist
    scripts_dir = Path("scripts")
    scripts_dir.mkdir(exist_ok=True)
    
    # Run admin setup
    if not run_admin_setup():
        print("\n❌ Failed to set up admin user")
        return
    
    # Verify database
    if not verify_database():
        print("\n❌ Database verification failed")
        return
    
    print("\n✅ Database setup complete!")
    print("\n🎯 Next steps:")
    print("   1. Start the server: python setup_database.py --start-server")
    print("   2. Test the API: curl http://localhost:8000/health")
    print("   3. View API docs: http://localhost:8000/docs")
    print("   4. Login with Firebase to access admin features")
    
    # Check if user wants to start server
    if len(sys.argv) > 1 and sys.argv[1] == "--start-server":
        start_server()

if __name__ == "__main__":
    main() 