import os
import sys
import json
import subprocess
import requests
import tempfile
import platform
from dotenv import load_dotenv

def run_command(command):
    try:
        result = subprocess.check_output(command, shell=True, text=True).strip()
        return result
    except subprocess.CalledProcessError as e:
        print(f"❌ Error: {e}")
        return None

def send_request_to_the_bridge(json_payload, auth_secret, authorization, endpoint):
    headers = {
        "X_AUTH_SECRET": auth_secret,
        "Authorization": authorization,
        "Content-Type": "application/json"
    }
    
    response = requests.post(endpoint, headers=headers, data=json_payload)
    
    if response.status_code == 200:
        response_data = response.json()
        upload_url = response_data.get('upload_url')
        if not upload_url:
            raise ValueError("Upload URL not found in the response.")
        return upload_url
    else:
        raise requests.HTTPError(f"Upload registration failed: {response.status_code} {response.text}")
    
def upload_car_file(upload_url, car_file_path):
    with open(car_file_path, 'rb') as f:
        response = requests.put(upload_url, data=f)
        if response.status_code not in [200, 201]:
            raise requests.HTTPError(f"CAR file upload failed: {response.status_code} {response.text}")

def upload_add(cid):
    payload = {
        "tasks": [
            ["upload/add", "did:key:z6Mkabc123", {"root": {"/": cid}, "shards": []}]
        ]
    }
    return send_request(payload)


def upload_list():
    payload = {
        "tasks": [
            ["upload/list", "did:key:z6Mkabc123", {}]
        ]
    }
    return send_request(payload)


def upload_remove(cid):
    payload = {
        "tasks": [
            ["upload/remove", "did:key:z6Mkabc123", {"root": {"/": cid}}]
        ]
    }
    return send_request(payload)


def send_request(payload,endpoint,headers):
    response = requests.post(endpoint, headers=headers, json=payload)
    if response.status_code == 200:
        return response.json()
    else:
        raise requests.HTTPError(f"Request failed: {response.status_code} {response.text}")

def main():
    load_dotenv()
    
    auth_secret = os.getenv("X_AUTH_SECRET_HEADER")
    authorization = os.getenv("AUTHORIZATION_HEADER")
    endpoint = os.getenv("HTTPS_ENDPOINT", "https://up.storacha.network/bridge")
    
    if len(sys.argv) < 2:
     print("❌ Error: Please provide an operation (upload_add, upload_list, upload_remove) and optional CID.")
     print("Usage: python storacha_uploader.py <operation> <CID>")
     sys.exit(1)

    operation = sys.argv[1]
    cid = sys.argv[2] if len(sys.argv) > 2 else None

    operations = {
     "upload_add": upload_add,
     "upload_list": upload_list,
     "upload_remove": upload_remove,
     }

    if operation in operations:
     result = operations[operation](cid if "list" not in operation else None)
     print(json.dumps(result, indent=2))
    else:
     print(f"Unknown operation: {operation}")

    
    file_path = sys.argv[1]
    
    space_did = os.getenv("SPACE_DID")
    if not space_did:
        print("❌ Error: SPACE_DID not found in .env file.")
        print("Please add SPACE_DID=your_space_did to your .env file.")
        sys.exit(1)
    
    print(f"🔑 Using Space DID: {space_did}")
    
    car_file = f"{file_path}.car"
    ipfs_car_cmd = ["ipfs-car", "pack", file_path, "--output", car_file]

    try:
     result = subprocess.run(ipfs_car_cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
     cid = result.stdout.decode().strip().split('\n')[-1]
     print(f"✅ CAR file created: {car_file} with CID: {cid}")
    except subprocess.CalledProcessError as e:
     print(f"❌ Error creating CAR file: {e.stderr.decode().strip()}")
     sys.exit(1)

     upload_url = send_request_to_the_bridge(auth_secret, authorization, endpoint)
     upload_car_file(upload_url, car_file)
     upload_add(cid)
     print(f"✅ File uploaded successfully to Storacha network.")
     print(f"✅ Access your file at: https://{cid}.ipfs.w3s.link")
     print(f"✅ Response details: {json.dumps(result, indent=2)}")
     
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
if __name__ == "__main__":
    main()
