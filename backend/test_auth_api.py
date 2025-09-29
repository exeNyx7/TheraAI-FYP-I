#!/usr/bin/env python3
"""
Comprehensive Authentication System Test
Tests all authentication endpoints with real HTTP requests
"""

import asyncio
import httpx
import json
from datetime import datetime

# Test configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/v1"

async def test_authentication_system():
    """Comprehensive test of authentication system"""
    print("🧪 Starting Authentication System Tests")
    print("=" * 60)
    
    async with httpx.AsyncClient() as client:
        test_results = {}
        
        # Test 1: Health Check
        print("\n1️⃣ Testing Health Endpoints...")
        try:
            # Root health
            response = await client.get(f"{BASE_URL}/health")
            print(f"   Health Check: {response.status_code}")
            if response.status_code == 200:
                health_data = response.json()
                print(f"   ✅ Status: {health_data.get('status')}")
                print(f"   ✅ Database: {health_data.get('database', {}).get('status')}")
            
            # Auth service health  
            response = await client.get(f"{API_BASE}/auth/health")
            print(f"   Auth Health: {response.status_code}")
            test_results["health"] = response.status_code == 200
            
        except Exception as e:
            print(f"   ❌ Health check failed: {e}")
            test_results["health"] = False
        
        # Test 2: User Registration
        print("\n2️⃣ Testing User Registration...")
        test_user = {
            "email": f"testuser_{datetime.now().strftime('%H%M%S')}@example.com",
            "password": "SecurePass123!",
            "confirm_password": "SecurePass123!",
            "full_name": "Test User",
            "role": "patient"
        }
        
        try:
            response = await client.post(f"{API_BASE}/auth/signup", json=test_user)
            print(f"   Signup Status: {response.status_code}")
            
            if response.status_code == 201:
                user_data = response.json()
                print(f"   ✅ User created: {user_data.get('email')}")
                print(f"   ✅ Role: {user_data.get('role')}")
                print(f"   ✅ Active: {user_data.get('is_active')}")
                test_results["signup"] = True
            else:
                print(f"   ❌ Signup failed: {response.text}")
                test_results["signup"] = False
                
        except Exception as e:
            print(f"   ❌ Signup error: {e}")
            test_results["signup"] = False
        
        # Test 3: User Login
        print("\n3️⃣ Testing User Login...")
        login_data = {
            "email": test_user["email"],
            "password": test_user["password"]
        }
        
        access_token = None
        try:
            response = await client.post(f"{API_BASE}/auth/login", json=login_data)
            print(f"   Login Status: {response.status_code}")
            
            if response.status_code == 200:
                token_data = response.json()
                access_token = token_data.get("access_token")
                print(f"   ✅ Token received: {access_token[:20]}...")
                print(f"   ✅ Token type: {token_data.get('token_type')}")
                print(f"   ✅ Expires in: {token_data.get('expires_in')} seconds")
                test_results["login"] = True
            else:
                print(f"   ❌ Login failed: {response.text}")
                test_results["login"] = False
                
        except Exception as e:
            print(f"   ❌ Login error: {e}")
            test_results["login"] = False
        
        # Test 4: Protected Endpoint Access
        print("\n4️⃣ Testing Protected Endpoints...")
        if access_token:
            headers = {"Authorization": f"Bearer {access_token}"}
            
            try:
                # Test /me endpoint
                response = await client.get(f"{API_BASE}/auth/me", headers=headers)
                print(f"   /me endpoint: {response.status_code}")
                
                if response.status_code == 200:
                    user_data = response.json()
                    print(f"   ✅ Current user: {user_data.get('email')}")
                    print(f"   ✅ Role: {user_data.get('role')}")
                    test_results["protected"] = True
                else:
                    print(f"   ❌ Protected endpoint failed: {response.text}")
                    test_results["protected"] = False
                    
            except Exception as e:
                print(f"   ❌ Protected endpoint error: {e}")
                test_results["protected"] = False
        else:
            print("   ⏭️ Skipping protected endpoint test (no token)")
            test_results["protected"] = False
        
        # Test 5: Invalid Credentials
        print("\n5️⃣ Testing Security (Invalid Credentials)...")
        try:
            invalid_login = {
                "email": test_user["email"],
                "password": "wrongpassword"
            }
            
            response = await client.post(f"{API_BASE}/auth/login", json=invalid_login)
            print(f"   Invalid login: {response.status_code}")
            
            if response.status_code == 401:
                print("   ✅ Correctly rejected invalid credentials")
                test_results["security"] = True
            else:
                print("   ❌ Security issue: Invalid credentials accepted")
                test_results["security"] = False
                
        except Exception as e:
            print(f"   ❌ Security test error: {e}")
            test_results["security"] = False
        
        # Test 6: Duplicate Email Registration
        print("\n6️⃣ Testing Duplicate Email Prevention...")
        try:
            # Try to register same email again
            response = await client.post(f"{API_BASE}/auth/signup", json=test_user)
            print(f"   Duplicate signup: {response.status_code}")
            
            if response.status_code == 400:
                print("   ✅ Correctly rejected duplicate email")
                test_results["duplicate"] = True
            else:
                print("   ❌ Duplicate email was allowed")
                test_results["duplicate"] = False
                
        except Exception as e:
            print(f"   ❌ Duplicate test error: {e}")
            test_results["duplicate"] = False
    
    # Summary
    print("\n" + "=" * 60)
    print("🏆 TEST RESULTS SUMMARY")
    print("=" * 60)
    
    passed = sum(test_results.values())
    total = len(test_results)
    
    for test_name, result in test_results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {test_name.upper():<12}: {status}")
    
    print(f"\nOverall: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    
    if passed == total:
        print("🎉 All tests passed! Authentication system is working perfectly!")
    else:
        print("⚠️ Some tests failed. Check the output above for details.")
    
    return test_results


if __name__ == "__main__":
    print("Starting authentication system tests...")
    print("Make sure the server is running on http://localhost:8000")
    print()
    
    try:
        asyncio.run(test_authentication_system())
    except KeyboardInterrupt:
        print("\n\n⏹️ Tests interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Test suite error: {e}")
        import traceback
        traceback.print_exc()