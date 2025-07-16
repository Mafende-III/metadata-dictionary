#!/bin/bash

echo "🔍 DHIS2 Metadata Dictionary - External Access Test"
echo "=================================================="

# Get current IP
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
echo "📍 Your IP Address: $LOCAL_IP"

# Test if server is running
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Server is running locally"
else
    echo "❌ Server not running - start with: npm run dev"
    exit 1
fi

# Test external IP access
echo "🌐 Testing external access..."
if curl -s http://$LOCAL_IP:3000 > /dev/null; then
    echo "✅ Server accessible via external IP"
else
    echo "❌ Server not accessible externally"
    exit 1
fi

# Test port binding
PORT_CHECK=$(netstat -an | grep ":3000" | grep "LISTEN")
if [[ $PORT_CHECK == *"*.*"* ]]; then
    echo "✅ Server listening on all interfaces"
else
    echo "❌ Server only listening locally"
    echo "   Fix: Use HOST=0.0.0.0 npm run dev"
fi

echo ""
echo "🎯 External URLs for users:"
echo "   Main App: http://$LOCAL_IP:3000"
echo "   Monitoring: http://$LOCAL_IP:3000/admin/monitoring"
echo ""
echo "📱 Test from another device:"
echo "   1. Connect device to same WiFi network"
echo "   2. Open browser and go to: http://$LOCAL_IP:3000"
echo "   3. If it doesn't work, check:"
echo "      - macOS Firewall (System Settings > Network > Firewall)"
echo "      - Router firewall settings"
echo ""

# Check firewall hint
echo "💡 To check/disable macOS firewall:"
echo "   System Settings > General > Sharing > Advanced > Firewall Options"