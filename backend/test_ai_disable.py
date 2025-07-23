#!/usr/bin/env python3
"""
Test script to verify AI disable functionality
Tests that all AI components are properly disabled when ENABLE_AI=false
"""

import os
import sys
import asyncio
from datetime import datetime

# Set environment to disable AI
os.environ['ENABLE_AI'] = 'false'
os.environ['DATABASE_URL'] = 'sqlite:///test.db'  # Use SQLite for testing

def test_environment_variable():
    """Test that ENABLE_AI environment variable is correctly read"""
    print("🧪 Testing environment variable...")
    from dotenv import load_dotenv
    load_dotenv()
    
    enable_ai = os.getenv('ENABLE_AI', 'false').lower() == 'true'
    
    if not enable_ai:
        print("   ✅ ENABLE_AI correctly set to false")
        return True
    else:
        print("   ❌ ENABLE_AI should be false")
        return False

def test_ai_service_stubs():
    """Test that AI service stubs are loaded instead of real services"""
    print("🧪 Testing AI service stubs...")
    
    try:
        from ai_service import MedicalAI, DataCollector, RealDataCollector, ModelTrainer
        
        # Test instantiation
        ai = MedicalAI()
        collector = DataCollector()
        real_collector = RealDataCollector()
        trainer = ModelTrainer()
        
        print("   ✅ All AI service stubs instantiate successfully")
        
        # Test that they return proper stub responses
        result = trainer.load_training_data("database")
        if not result:
            print("   ✅ ModelTrainer correctly returns False for loading data")
        else:
            print("   ❌ ModelTrainer should return False when disabled")
            return False
            
        return True
        
    except Exception as e:
        print(f"   ❌ Error testing AI service stubs: {e}")
        return False

def test_ai_router_stub():
    """Test that AI router stub is loaded instead of real router"""
    print("🧪 Testing AI router stub...")
    
    try:
        from ai_router_stub import router
        
        # Check router properties
        if router.prefix == "/api/ai":
            print("   ✅ Router has correct prefix")
        else:
            print("   ❌ Router prefix incorrect")
            return False
            
        if "отключено" in str(router.tags).lower():
            print("   ✅ Router tags indicate AI is disabled")
        else:
            print("   ❌ Router tags should indicate AI is disabled")
            return False
            
        # Check that routes exist
        if len(router.routes) >= 7:  # Should have all the stub routes
            print(f"   ✅ Router has {len(router.routes)} stub routes")
        else:
            print(f"   ❌ Router should have at least 7 routes, has {len(router.routes)}")
            return False
            
        return True
        
    except Exception as e:
        print(f"   ❌ Error testing AI router stub: {e}")
        return False

def test_continuous_learning_scripts():
    """Test that continuous learning scripts exit when AI is disabled"""
    print("🧪 Testing continuous learning scripts...")
    
    try:
        # Test ai_continuous_learning.py
        result = os.system(f'cd {os.path.dirname(__file__)} && python ai_continuous_learning.py > /tmp/ai_test.log 2>&1')
        exit_code = os.WEXITSTATUS(result)
        
        if exit_code == 0:  # Script should exit with code 0 when AI disabled
            print("   ✅ ai_continuous_learning.py correctly exits when AI disabled")
        else:
            print(f"   ❌ ai_continuous_learning.py exit code: {exit_code}")
            return False
            
        # Check the log for expected message
        try:
            with open("/tmp/ai_test.log", "r") as f:
                log_content = f.read()
                if "AI функции отключены" in log_content:
                    print("   ✅ Correct disable message in logs")
                else:
                    print("   ❌ Expected disable message not found in logs")
                    print(f"   Log content: {log_content}")
                    return False
        except FileNotFoundError:
            print("   ❌ Log file not created")
            return False
            
        return True
        
    except Exception as e:
        print(f"   ❌ Error testing continuous learning scripts: {e}")
        return False

async def test_ai_service_responses():
    """Test that AI services return appropriate disabled responses"""
    print("🧪 Testing AI service responses...")
    
    try:
        from ai_service.stubs import MedicalAI, RealDataCollector, ModelTrainer
        
        # Test MedicalAI
        ai = MedicalAI()
        result = await ai.analyze_symptoms("test symptoms", patient_id=1)
        
        if result.get("error") == "AI_DISABLED":
            print("   ✅ MedicalAI returns AI_DISABLED error")
        else:
            print("   ❌ MedicalAI should return AI_DISABLED error")
            return False
            
        # Test RealDataCollector
        collector = RealDataCollector()
        result = await collector.collect_all_sources(limit=10)
        
        if not result.get("success") and result.get("error") == "AI_DISABLED":
            print("   ✅ RealDataCollector returns disabled response")
        else:
            print("   ❌ RealDataCollector should return disabled response")
            return False
            
        # Test ModelTrainer
        trainer = ModelTrainer()
        result = await trainer.train_all_models()
        
        if not result.get("success") and result.get("error") == "AI_DISABLED":
            print("   ✅ ModelTrainer returns disabled response")
        else:
            print("   ❌ ModelTrainer should return disabled response")
            return False
            
        return True
        
    except Exception as e:
        print(f"   ❌ Error testing AI service responses: {e}")
        return False

def test_requirements_txt():
    """Test that heavy ML dependencies are commented out"""
    print("🧪 Testing requirements.txt...")
    
    try:
        requirements_path = os.path.join(os.path.dirname(__file__), "requirements.txt")
        
        with open(requirements_path, 'r') as f:
            content = f.read()
            
        # Check that heavy dependencies are commented
        heavy_deps = ['torch', 'transformers', 'scikit-learn', 'sentence-transformers']
        all_commented = True
        
        for dep in heavy_deps:
            lines = [line.strip() for line in content.split('\n') if dep in line]
            uncommented_lines = [line for line in lines if not line.startswith('#') and line.strip()]
            
            if uncommented_lines:
                print(f"   ❌ {dep} is not commented out: {uncommented_lines}")
                all_commented = False
            else:
                print(f"   ✅ {dep} is properly commented out")
                
        return all_commented
        
    except Exception as e:
        print(f"   ❌ Error testing requirements.txt: {e}")
        return False

async def main():
    """Run all tests"""
    print("🚀 Starting AI disable functionality tests...")
    print("=" * 60)
    
    tests = [
        test_environment_variable,
        test_ai_service_stubs,
        test_ai_router_stub,
        test_continuous_learning_scripts,
        test_requirements_txt
    ]
    
    async_tests = [
        test_ai_service_responses
    ]
    
    results = []
    
    # Run synchronous tests
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"   ❌ Test failed with exception: {e}")
            results.append(False)
        print()
    
    # Run asynchronous tests
    for test in async_tests:
        try:
            result = await test()
            results.append(result)
        except Exception as e:
            print(f"   ❌ Async test failed with exception: {e}")
            results.append(False)
        print()
    
    # Summary
    print("=" * 60)
    passed = sum(results)
    total = len(results)
    
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! AI is properly disabled.")
        return True
    else:
        print("❌ Some tests failed. Please check the output above.")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)