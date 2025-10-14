#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

KIBANA_URL="http://localhost:5601"
OUTPUT_FILE="./saved-objects/kibana-export.ndjson"

echo "========================================="
echo "Kibana Dashboard Exporter"
echo "========================================="
echo ""

# Check if Kibana is accessible
echo "Checking Kibana availability..."
if ! curl -s "$KIBANA_URL/api/status" > /dev/null; then
    echo "❌ Error: Cannot connect to Kibana at $KIBANA_URL"
    echo "   Make sure Kibana is running: docker-compose up -d kibana"
    exit 1
fi

echo "✅ Kibana is accessible"
echo ""

# Export saved objects
echo "Exporting Kibana saved objects..."
echo "   - Index patterns"
echo "   - Dashboards"
echo "   - Visualizations"
echo "   - Saved searches"
echo ""

curl -X POST "$KIBANA_URL/api/saved_objects/_export" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "type": ["dashboard", "visualization", "index-pattern", "search", "lens"],
    "includeReferencesDeep": true
  }' > "$OUTPUT_FILE" 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Export successful!${NC}"
    echo ""
    echo "📁 Saved to: $OUTPUT_FILE"
    echo ""
    echo "Next steps:"
    echo "  1. Review the exported file"
    echo "  2. Commit to git:"
    echo "     ${YELLOW}git add $OUTPUT_FILE${NC}"
    echo "     ${YELLOW}git commit -m 'Update Kibana dashboards'${NC}"
    echo ""
    echo "  3. Take screenshots of your dashboards and save to:"
    echo "     ${YELLOW}./screenshots/${NC}"
    echo ""
else
    echo "❌ Export failed!"
    exit 1
fi