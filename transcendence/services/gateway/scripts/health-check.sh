#!/bin/bash

# set -e

# Define list of services and URLs
# Format: "ServiceName|URL"
# http
services=(
  "gateway|http://127.0.0.1:3000/health"
  "game-service|http://127.0.0.1:3000/game-service/health"
  "user-service|http://127.0.0.1:3000/user-service/health"
  "log-service|http://127.0.0.1:3000/log-service/health"
)

#http-localhost
services1=(
  "gateway|http://localhost:3000/health"
  "game-service|http://localhost:3000/game-service/health"
  "user-service|http://localhost:3000/user-service/health"
  "log-service|http://localhost:3000/log-service/health"
)

#https
# services1=(
#   "gateway|https://127.0.0.1:3000/health"
#   "game-service|https://127.0.0.1:3000/game-service/health"
#   "user-service|https://127.0.0.1:3000/user-service/health"
#   "log-service|https://127.0.0.1:3000/log-service/health"
# )


#negative test cases
  # "gateway|http://127.0.0.1:3000/health"
services2=(
  "game-service|http://127.0.0.1:3002/health"
  "user-service|http://127.0.0.1:3001/health"
  "log-service|http://127.0.0.1:3003/health"
)

# Function to check a URL
check_url_pos() {
	local name="$1"
	local url="$2"

	# Use curl to get HTTP status code silently
	http_status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
	curl_exit_code=$?

	if [[ $curl_exit_code -ne 0 ]]; then
		echo "[FAIL]  $name - curl failed (exit code $curl_exit_code) ❌"
	exit 1
	fi

	if [[ $http_status =~ ^2|3 ]]; then
		echo "[OK]    $name is UP (HTTP $url $http_status) ✅"
	else
		echo "[FAIL]  $name is DOWN or unreachable (HTTP $url $http_status) ❌"
		exit 1
	fi
}

check_url_neg() {
	local name="$1"
	local url="$2"

	# Use curl to get HTTP status code silently
	http_status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
	curl_exit_code=$?

	# if [[ $curl_exit_code -ne 0 ]]; then
	# 	echo "[FAIL]  $name - curl failed (exit code $curl_exit_code) ❌"
	# 	exit 1
	# fi
	if [[ $curl_exit_code -ne 0 || ! $http_status =~ ^2|3 ]]; then
		echo "[OK]    $name is directly unreachable via port (HTTP $url $http_status) ✅"
	else
		echo "[FAIL]  $name is directly reachable via port (HTTP $url $http_status) ❌"
		exit 1
	fi
}

# Loop through each service and check it
#http
for entry in "${services[@]}"; do
  IFS="|" read -r name url <<< "$entry"
  check_url_pos "$name" "$url"
done

#localhost
for entry in "${services1[@]}"; do
  IFS="|" read -r name url <<< "$entry"
  check_url_pos "$name" "$url"
done

#https

#direct access via port
# for entry in "${services2[@]}"; do
#   IFS="|" read -r name url <<< "$entry"
#   check_url_neg "$name" "$url"
# done