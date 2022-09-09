## Classes

<dl>
<dt><a href="#Client">Client</a></dt>
<dd></dd>
</dl>

## Constants

<dl>
<dt><a href="#importToken">importToken</a> ⇒ <code>Promise.&lt;(API.Delegation|Failure)&gt;</code></dt>
<dd></dd>
</dl>

## Functions

<dl>
<dt><a href="#sleep">sleep(ms)</a> ⇒ <code>Promise.&lt;void&gt;</code></dt>
<dd><p>Create a promise that resolves in ms.</p>
</dd>
<dt><a href="#createClient">createClient(options)</a> ⇒</dt>
<dd></dd>
</dl>

## Typedefs

<dl>
<dt><a href="#Link">Link</a> : <code>string</code></dt>
<dd><p>A string representing a link to another object in IPLD</p>
</dd>
<dt><a href="#Result">Result</a> : <code>API.Result.&lt;(unknown|string), ({error: true}|API.HandlerExecutionError|API.Failure)&gt;</code></dt>
<dd></dd>
<dt><a href="#ClientOptions">ClientOptions</a> : <code>object</code></dt>
<dd></dd>
</dl>

<a name="Client"></a>

## Client
**Kind**: global class  

* [Client](#Client)
    * [new Client(options)](#new_Client_new)
    * [.identity()](#Client+identity) ⇒ <code>Promise.&lt;API.SigningAuthority&gt;</code>
    * [.register(email)](#Client+register)
    * [.whoami()](#Client+whoami) ⇒ [<code>Promise.&lt;Result&gt;</code>](#Result)
    * [.list()](#Client+list) ⇒ [<code>Promise.&lt;Result&gt;</code>](#Result)
    * [.upload(bytes)](#Client+upload) ⇒ <code>Promise.&lt;(Result\|undefined)&gt;</code>
    * [.remove(link)](#Client+remove)
    * [.linkroot(root, links)](#Client+linkroot)
    * [.insights(link)](#Client+insights) ⇒ <code>Promise.&lt;object&gt;</code>

<a name="new_Client_new"></a>

### new Client(options)
Create an instance of the w3 client.


| Param | Type |
| --- | --- |
| options | [<code>ClientOptions</code>](#ClientOptions) | 

<a name="Client+identity"></a>

### client.identity() ⇒ <code>Promise.&lt;API.SigningAuthority&gt;</code>
Get the current "machine" DID

**Kind**: instance method of [<code>Client</code>](#Client)  
<a name="Client+register"></a>

### client.register(email)
Register a user by email.

**Kind**: instance method of [<code>Client</code>](#Client)  

| Param | Type | Description |
| --- | --- | --- |
| email | <code>string</code> \| <code>undefined</code> | The email address to register with. |

<a name="Client+whoami"></a>

### client.whoami() ⇒ [<code>Promise.&lt;Result&gt;</code>](#Result)
**Kind**: instance method of [<code>Client</code>](#Client)  
<a name="Client+list"></a>

### client.list() ⇒ [<code>Promise.&lt;Result&gt;</code>](#Result)
List all of the uploads connected to this user.

**Kind**: instance method of [<code>Client</code>](#Client)  
<a name="Client+upload"></a>

### client.upload(bytes) ⇒ <code>Promise.&lt;(Result\|undefined)&gt;</code>
Upload a car via bytes.

**Kind**: instance method of [<code>Client</code>](#Client)  

| Param | Type | Description |
| --- | --- | --- |
| bytes | <code>Uint8Array</code> | the url to upload |

<a name="Client+remove"></a>

### client.remove(link)
Remove an uploaded file by CID

**Kind**: instance method of [<code>Client</code>](#Client)  

| Param | Type | Description |
| --- | --- | --- |
| link | <code>API.Link</code> | the CID to remove |

<a name="Client+linkroot"></a>

### client.linkroot(root, links)
Remove an uploaded file by CID

**Kind**: instance method of [<code>Client</code>](#Client)  

| Param | Type | Description |
| --- | --- | --- |
| root | <code>string</code> | the CID to link as root. |
| links | <code>Array.&lt;string&gt;</code> | the CIDs to link as 'children' |

<a name="Client+insights"></a>

### client.insights(link) ⇒ <code>Promise.&lt;object&gt;</code>
**Kind**: instance method of [<code>Client</code>](#Client)  

| Param | Type | Description |
| --- | --- | --- |
| link | [<code>Link</code>](#Link) | the CID to get insights for |

<a name="importToken"></a>

## importToken ⇒ <code>Promise.&lt;(API.Delegation\|Failure)&gt;</code>
**Kind**: global constant  

| Param | Type |
| --- | --- |
| input | <code>UCAN.JWT</code> | 

<a name="sleep"></a>

## sleep(ms) ⇒ <code>Promise.&lt;void&gt;</code>
Create a promise that resolves in ms.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| ms | <code>number</code> | The number of milliseconds to sleep for. |

<a name="createClient"></a>

## createClient(options) ⇒
**Kind**: global function  
**Returns**: Client  

| Param | Type |
| --- | --- |
| options | [<code>ClientOptions</code>](#ClientOptions) | 

<a name="Link"></a>

## Link : <code>string</code>
A string representing a link to another object in IPLD

**Kind**: global typedef  
<a name="Result"></a>

## Result : <code>API.Result.&lt;(unknown\|string), ({error: true}\|API.HandlerExecutionError\|API.Failure)&gt;</code>
**Kind**: global typedef  
<a name="ClientOptions"></a>

## ClientOptions : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| serviceDID | <code>API.DID</code> | The DID of the service to talk to. |
| serviceURL | <code>string</code> | The URL of the service to talk to. |
| accessURL | <code>string</code> | The URL of the access service. |
| accessDID | <code>API.DID</code> | The DID of the access service. |
| settings | <code>Map.&lt;string, any&gt;</code> | A map/db of settings to use for the client. |

