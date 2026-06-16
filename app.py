import os
import time
import hashlib
import logging
import requests
import xml.etree.ElementTree as ET
from flask import Flask, render_template, jsonify, request
from bs4 import BeautifulSoup

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Simple in-memory cache
feed_cache = {
    'data': None,
    'last_updated': 0
}
CACHE_DURATION = 1800  # 30 minutes cache

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def parse_release_notes(xml_content):
    """
    Parses the BigQuery Atom feed and segments each entry by <h3> tags
    to extract individual release note items.
    """
    root = ET.fromstring(xml_content)
    # Atom namespace
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    notes = []
    
    for entry in root.findall('atom:entry', ns):
        # Entry date is usually in the <title> tag (e.g., "June 15, 2026")
        title_el = entry.find('atom:title', ns)
        date_str = title_el.text.strip() if title_el is not None else "Unknown Date"
        
        # Link to the specific date on the release notes page
        link_el = entry.find('atom:link[@rel="alternate"]', ns)
        if link_el is None:
            link_el = entry.find('atom:link', ns)
        entry_link = link_el.attrib.get('href') if link_el is not None else "https://cloud.google.com/bigquery/docs/release-notes"
        
        content_el = entry.find('atom:content', ns)
        if content_el is None or content_el.text is None:
            continue
            
        # Parse the HTML content in the CDATA section
        soup = BeautifulSoup(content_el.text, 'html.parser')
        
        current_type = "Update"
        current_html_nodes = []
        
        # Helper function to append note
        def add_note(type_name, html_nodes):
            if not html_nodes:
                return
            
            # Reconstruct HTML and clean it up
            html_str = "".join(str(node) for node in html_nodes).strip()
            
            # Simple text parsing for raw description
            temp_soup = BeautifulSoup(html_str, 'html.parser')
            text_str = temp_soup.get_text().strip()
            
            # Create a unique ID using date and text content
            note_hash = hashlib.md5(f"{date_str}-{text_str}".encode('utf-8')).hexdigest()
            
            notes.append({
                'id': note_hash,
                'date': date_str,
                'type': type_name,
                'content_html': html_str,
                'content_text': text_str,
                'link': entry_link
            })

        for child in soup.contents:
            if child.name == 'h3':
                # If we've gathered items for a previous section, add them
                add_note(current_type, current_html_nodes)
                current_html_nodes = []
                current_type = child.get_text().strip()
            else:
                # Add child node to the current section content
                current_html_nodes.append(child)
                
        # Append the final item in the entry
        add_note(current_type, current_html_nodes)
        
    return notes

def fetch_and_cache_feed(force_refresh=False):
    """
    Fetches the feed from Google Cloud. Uses the cached response if valid,
    unless force_refresh is True.
    """
    now = time.time()
    
    if not force_refresh and feed_cache['data'] is not None and (now - feed_cache['last_updated']) < CACHE_DURATION:
        logger.info("Serving feed data from in-memory cache.")
        return feed_cache['data'], False
        
    logger.info("Fetching fresh feed from remote URL: %s", FEED_URL)
    try:
        response = requests.get(FEED_URL, timeout=15)
        response.raise_for_status()
        
        parsed_notes = parse_release_notes(response.content)
        
        # Update cache
        feed_cache['data'] = parsed_notes
        feed_cache['last_updated'] = now
        return parsed_notes, True
        
    except Exception as e:
        logger.error("Error fetching or parsing feed: %s", str(e))
        if feed_cache['data'] is not None:
            logger.info("Falling back to cached data after fetch failure.")
            return feed_cache['data'], False
        raise e

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/notes')
def get_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        notes, fetched_fresh = fetch_and_cache_feed(force_refresh)
        return jsonify({
            'success': True,
            'notes': notes,
            'fetched_fresh': fetched_fresh,
            'last_updated': feed_cache['last_updated']
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    # Default to port 5000
    app.run(host='127.0.0.1', port=5000, debug=True)
