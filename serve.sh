#!/bin/bash
echo "============================================"
echo "  DOG OVERLAY - Local Server"
echo "============================================"
echo ""
echo "  Open OBS Browser Source at:"
echo "  http://localhost:8080"
echo ""
echo "  Press Ctrl+C to stop the server."
echo "============================================"
echo ""
python3 -m http.server 8080
