#!/bin/bash

# Test QR Scanner Components
# This script helps test scanner functionality across devices

echo "🔍 QR Scanner Test Suite"
echo "========================"

# Function to open URL
open_url() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open "$1"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        xdg-open "$1"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        start "$1"
    else
        echo "Please open manually: $1"
    fi
}

# Check if server is running
check_server() {
    echo "⏳ Checking if development server is running..."
    
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
        echo "✅ Server is running"
        return 0
    else
        echo "❌ Server is not running"
        echo "Starting development server..."
        npm run dev &
        SERVER_PID=$!
        sleep 5
        return 1
    fi
}

# Test pages
test_pages() {
    echo ""
    echo "📱 Opening test pages..."
    echo "------------------------"
    
    # Main scanner page
    echo "1. Main Scanner Page"
    open_url "http://localhost:3000/scanner"
    
    sleep 2
    
    # Test scanners page
    echo "2. Test Scanners Page"
    open_url "http://localhost:3000/test-scanners"
    
    sleep 2
    
    # Assets page
    echo "3. Assets Management Page"
    open_url "http://localhost:3000/assets"
}

# Generate test QR codes
generate_test_qr() {
    echo ""
    echo "🏷️ Generating test QR codes..."
    echo "------------------------------"
    
    # Create test QR codes using Node.js
    node -e "
    const QRCode = require('qrcode');
    const fs = require('fs');
    
    const testCodes = [
        'IT001',
        'HR002',
        'FIN003',
        'ASSET123',
        JSON.stringify({ asset_code: 'TEST001', name: 'Test Asset' })
    ];
    
    if (!fs.existsSync('test-qr-codes')) {
        fs.mkdirSync('test-qr-codes');
    }
    
    testCodes.forEach(async (code, index) => {
        const fileName = \`test-qr-codes/qr-\${index + 1}.png\`;
        await QRCode.toFile(fileName, code);
        console.log(\`✅ Generated: \${fileName} - Content: \${code}\`);
    });
    " 2>/dev/null || echo "⚠️ QRCode package not installed. Run: npm install qrcode"
}

# Camera test
test_camera() {
    echo ""
    echo "📸 Camera Test"
    echo "--------------"
    
    node -e "
    console.log('Testing camera availability...');
    
    // This would need to be run in browser context
    const testScript = \`
    navigator.mediaDevices.enumerateDevices()
        .then(devices => {
            const cameras = devices.filter(d => d.kind === 'videoinput');
            console.log('Found', cameras.length, 'camera(s)');
            cameras.forEach(cam => console.log('-', cam.label || 'Camera'));
        })
        .catch(err => console.error('Camera error:', err));
    \`;
    
    console.log('Run this in browser console:');
    console.log(testScript);
    "
}

# Performance test
performance_test() {
    echo ""
    echo "⚡ Performance Check"
    echo "-------------------"
    
    echo "Running Lighthouse audit..."
    
    if command -v lighthouse >/dev/null 2>&1; then
        lighthouse http://localhost:3000/scanner \
            --only-categories=performance \
            --quiet \
            --chrome-flags="--headless" \
            --output=json \
            --output-path=./lighthouse-report.json
        
        echo "✅ Report saved to lighthouse-report.json"
    else
        echo "⚠️ Lighthouse not installed. Run: npm install -g lighthouse"
    fi
}

# Mobile test instructions
mobile_instructions() {
    echo ""
    echo "📱 Mobile Testing Instructions"
    echo "==============================="
    echo ""
    echo "1. Find your local IP address:"
    echo "   - Mac/Linux: ifconfig | grep inet"
    echo "   - Windows: ipconfig"
    echo ""
    echo "2. On your mobile device:"
    echo "   - Connect to same WiFi network"
    echo "   - Open browser"
    echo "   - Navigate to: http://[YOUR-IP]:3000/scanner"
    echo ""
    echo "3. Test checklist:"
    echo "   ✓ Camera permission request works"
    echo "   ✓ QR scanning works"
    echo "   ✓ Touch controls responsive"
    echo "   ✓ Layout fits screen"
    echo ""
}

# Browser compatibility
browser_test() {
    echo "🌐 Browser Compatibility"
    echo "========================"
    echo ""
    echo "Recommended browsers for testing:"
    echo "- Chrome 80+ (Desktop & Mobile)"
    echo "- Firefox 75+ (Desktop & Mobile)"
    echo "- Safari 14+ (Desktop & iOS)"
    echo "- Edge 80+ (Desktop)"
    echo ""
    echo "Test in each browser:"
    echo "1. Camera permission"
    echo "2. QR scanning"
    echo "3. Manual input"
    echo "4. Export functions"
    echo "5. Print functions"
}

# Main execution
main() {
    clear
    
    echo "================================"
    echo "   QR Scanner Test Suite v1.0   "
    echo "================================"
    echo ""
    
    # Check if server is running
    check_server
    SERVER_STARTED=$?
    
    # Run tests
    test_pages
    generate_test_qr
    test_camera
    mobile_instructions
    browser_test
    
    echo ""
    echo "================================"
    echo "   Testing Resources   "
    echo "================================"
    echo ""
    echo "📄 Documentation: /SCANNER_GUIDE.md"
    echo "🔧 Scanner configs: /src/lib/qr-utils.ts"
    echo "📱 Test page: http://localhost:3000/test-scanners"
    echo "📊 Performance: Run 'npm run build && npm run analyze'"
    echo ""
    
    # Cleanup if we started the server
    if [ $SERVER_STARTED -eq 1 ]; then
        echo "Press Ctrl+C to stop the development server"
        wait $SERVER_PID
    fi
}

# Run main function
main
