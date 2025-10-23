import requests

OWNER = "Zzzhenya"      # change this
REPO = "ft_transcnd"   # change this
BRANCH = "log-service"        # change this if your repo uses 'master' or another branch

API_URL = f"https://api.github.com/repos/{OWNER}/{REPO}/git/trees/{BRANCH}?recursive=1"
RAW_BASE = f"https://raw.githubusercontent.com/{OWNER}/{REPO}/{BRANCH}/"

response = requests.get(API_URL)
if response.status_code != 200:
    print("Error fetching repo tree:", response.json())
    exit(1)

data = response.json()

print("Files in repo with raw URLs:\n")
for item in data.get("tree", []):
    if item["type"] == "blob":  # only files
        raw_url = RAW_BASE + item["path"]
        print(raw_url)
