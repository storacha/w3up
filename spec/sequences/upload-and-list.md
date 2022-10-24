Upload and list are basically the same regardless of which payment model is used.

## Same flow whether app or user pays

Once the AppUI has established a valid delegation for uploading, the upload logic proceeds the same no matter which payment model is in use.

> In the below it starts to seem like maybe instead of Keyring we should be talking about w3up client... @jchris

### Upload with valid delegation

This will be the same both when the user pays, and in the case where the user's DID has a valid delegation allowing it to upload to the app's account.

```mermaid
sequenceDiagram
    participant Biometric
    participant AppUI
    participant Keyring
    participant AppServer
    participant Storage
    
    Note over AppServer, Storage: "The Cloud"
    Note over Biometric, Keyring: Alice's  Device
    Note over Biometric: Biometric <br>is optional
    
    AppUI ->> AppServer: Fetch web UI
    AppServer -->> AppUI: HTML content  
    Note over AppUI: Running app

AppUI ->> Keyring: Upload this file
Keyring ->> Biometric: Sign this invocation
Note over Biometric: Just sign, no scan.
Biometric -->> Keyring: Here's the signature
loop for chunk in file
    Keyring ->> Storage: Please run this upload invocation
    Storage -->> Keyring: OK, use these upload params
    Keyring ->> Storage: PUT the chunk
end
Keyring -->> AppUI: CID for uploaded file
Note right of AppUI: Remainder is optional
AppUI ->> AppServer: This CID is my recipe image
Note over Storage: In the app pays model<br>the AppServer can query<br>Storage to list uploads
AppServer -->> AppUI: ACK, I'll remember that

```

Note that in the server-pays model there will be other ways for the server to query user-saved data, so the user may not need to tell the server about their uploaded CID directly.


### List uploads with valid delegation



```mermaid
sequenceDiagram
    participant Biometric
    participant AppUI
    participant Keyring
    participant AppServer
    participant Storage
    
    Note over AppServer, Storage: "The Cloud"
    Note over Biometric, Keyring: Alice's  Device
    Note over Biometric: Biometric <br>is optional
    
    AppUI ->> AppServer: Fetch web UI
    AppServer -->> AppUI: HTML content  
    Note over AppUI: Running app

AppUI ->> Keyring: List my uploads
Keyring ->> Biometric: Sign this invocation
Note over Biometric: Just sign, no scan.
Biometric -->> Keyring: Here's the signature
Keyring ->> Storage: Invoke this upload listing
Storage -->> Keyring: Here's the list of uploads

```