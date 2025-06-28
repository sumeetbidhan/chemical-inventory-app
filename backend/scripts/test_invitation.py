#!/usr/bin/env python3
"""
Test script for invitation system
"""

import sys
import os

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.crud.invitation import create_invitation, get_invitation_by_email
from app.schema.invitation import InvitationCreate
from app.models.user import UserRole

def test_invitation():
    """Test creating an invitation"""
    print("🧪 Testing invitation system...")
    
    try:
        db = SessionLocal()
        
        # Test data
        test_email = "test@example.com"
        test_role = UserRole.LAB_STAFF
        
        # Check if invitation already exists
        existing = get_invitation_by_email(db, test_email)
        if existing:
            print(f"⚠️  Invitation already exists for {test_email}")
            print(f"   ID: {existing.id}, Status: {existing.status}")
        else:
            # Create new invitation
            invitation_data = InvitationCreate(
                email=test_email,
                role=test_role
            )
            
            invitation = create_invitation(db, invitation_data)
            print(f"✅ Created invitation:")
            print(f"   ID: {invitation.id}")
            print(f"   Email: {invitation.email}")
            print(f"   Role: {invitation.role}")
            print(f"   Status: {invitation.status}")
            print(f"   Invited at: {invitation.invited_at}")
        
        # List all invitations
        from app.crud.invitation import get_all_invitations
        all_invitations = get_all_invitations(db)
        print(f"\n📋 All invitations ({len(all_invitations)}):")
        for inv in all_invitations:
            print(f"   - {inv.email} ({inv.role}) - {inv.status}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Invitation Test Script")
    print("=" * 40)
    test_invitation() 