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

def create_dag_and_car(file_path):
    if not os.path.exists(file_path):
        print(f"❌ Error: File '{file_path}' not found.")
        sys.exit(1)

    print(f"📂 Adding '{file_path}' to IPFS DAG...")
    
    car_file = f"{file_path}.car"
    
    if platform.system() == "Windows":
        ipfs_car_cmd = f"npx ipfs-car pack {file_path} --output {car_file}"
    else:
        ipfs_car_cmd = f"ipfs-car pack {file_path} --output {car_file}"
    
    try:
        ipfs_car_cmd_results = subprocess.run(
            ipfs_car_cmd, shell=True, check=True,
            stderr=subprocess.PIPE, stdout=subprocess.PIPE
        )
        ipfs_car_cmd_output = ipfs_car_cmd_results.stdout.decode("utf-8").strip()
        cid = ipfs_car_cmd_output.split('\n')[-1]
        print(f"✅ CAR file created: {car_file}")
        print(f"✅ CID: {cid}")
        return cid, car_file
    except subprocess.CalledProcessError as e:
        print(f"❌ ipfs-car failed: {e.stderr.decode('utf-8')}")
        sys.exit(1)

def create_upload_json(cid, space_did):
    """Create the JSON payload for the upload/add operation."""
    if not space_did.startswith("did:"):
        space_did = f"did:key:{space_did}"
    
    data = {
        "tasks": [
            [
                "upload/add",
                space_did,
                {
                    "root": {"/": cid},
                    "shards": []
                }
            ]
        ]
    }
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as temp:
        json.dump(data, temp, indent=2)
        temp_json_path = temp.name
    
    return temp_json_path

def upload_to_storacha(json_file):
    """Upload to Storacha using the HTTP Bridge."""
    load_dotenv()
    
    auth_secret = os.getenv("X-AUTH-SECRET-HEADER")
    authorization = os.getenv("AUTHORIZATION-HEADER")
    endpoint = os.getenv("HTTPS-ENDPOINT", "https://up.storacha.network/bridge")
    
    if not auth_secret:
        raise ValueError("X-Auth-Secret is required in .env file as X-AUTH-SECRET-HEADER")
    if not authorization:
        raise ValueError("Authorization is required in .env file as AUTHORIZATION-HEADER")
    
    headers = {
        "X-Auth-Secret": auth_secret,
        "Authorization": authorization,
        "Content-Type": "application/json"
    }
    
    with open(json_file, 'r') as f:
        data = f.read()
    
    print(f"📤 Uploading to Storacha HTTP Bridge...")
    response = requests.post(
        endpoint,
        headers=headers,
        data=data
    )
    
    if response.status_code == 200:
        print("✅ Upload successful!")
        return response.json()
    else:
        print(f"❌ Upload failed with status code {response.status_code}: {response.text}")
        return None

def main():
    if len(sys.argv) < 2:
        print("❌ Error: Please provide a file path to upload.")
        print("Usage: python storacha_uploader.py <file_path>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    load_dotenv()
    
    space_did = os.getenv("SPACE_DID")
    
    if not space_did:
        print("❌ Error: SPACE_DID not found in .env file.")
        print("Please add SPACE_DID=your_space_did to your .env file.")
        sys.exit(1)
    
    print(f"🔑 Using Space DID: {space_did}")
    
    cid, car_file = create_dag_and_car(file_path)
    
    json_file = create_upload_json(cid, space_did)
    
    result = upload_to_storacha(json_file)
    
    os.unlink(json_file)
    
    if result:
        print(f"✅ File uploaded successfully to Storacha network.")
        print(f"✅ Access your file at: https://{cid}.ipfs.w3s.link")
        print(f"✅ Response details: {json.dumps(result, indent=2)}")
    else:
        print("❌ Upload failed.")

if __name__ == "__main__":
    main()
