## Classes

<dl>
<dt><a href="#Client">Client</a></dt>
<dd></dd>
</dl>

## Typedefs

<dl>
<dt><a href="#Link">Link</a> : <code>string</code></dt>
<dd><p>A string representing a link to another object in IPLD</p>
</dd>
<dt><a href="#ClientOptions">ClientOptions</a> : <code>object</code></dt>
<dd></dd>
</dl>

<a name="Client"></a>

## Client
**Kind**: global class  

* [Client](#Client)
    * [new Client(options)](#new_Client_new)
    * [.identity()](#Client+identity) ⇒ <code>Promise.&lt;Authority&gt;</code>
    * [.register(email)](#Client+register)
    * [.validate(token)](#Client+validate) ⇒ <code>Promise.&lt;(string\|undefined)&gt;</code>
    * [.list()](#Client+list)
    * [.upload(url)](#Client+upload)
    * [.remove(link)](#Client+remove)
    * [.insights(link)](#Client+insights) ⇒ <code>Promise.&lt;object&gt;</code>

<a name="new_Client_new"></a>

### new Client(options)
Create an instance of the w3 client.


| Param | Type |
| --- | --- |
| options | [<code>ClientOptions</code>](#ClientOptions) | 

<a name="Client+identity"></a>

### client.identity() ⇒ <code>Promise.&lt;Authority&gt;</code>
Get the current "machine" DID

**Kind**: instance method of [<code>Client</code>](#Client)  
<a name="Client+register"></a>

### client.register(email)
Register a user by email.

**Kind**: instance method of [<code>Client</code>](#Client)  

| Param | Type | Description |
| --- | --- | --- |
| email | <code>string</code> \| <code>undefined</code> | The email address to register with. |

<a name="Client+validate"></a>

### client.validate(token) ⇒ <code>Promise.&lt;(string\|undefined)&gt;</code>
Validate an email to token.

**Kind**: instance method of [<code>Client</code>](#Client)  

| Param | Type | Description |
| --- | --- | --- |
| token | <code>string</code> \| <code>undefined</code> | The token. |

<a name="Client+list"></a>

### client.list()
List all of the uploads connected to this user.

**Kind**: instance method of [<code>Client</code>](#Client)  
<a name="Client+upload"></a>

### client.upload(url)
Upload a file by URL.

**Kind**: instance method of [<code>Client</code>](#Client)  

| Param | Type | Description |
| --- | --- | --- |
| url | <code>URL</code> | the url to upload |

<a name="Client+remove"></a>

### client.remove(link)
Remove an uploaded file by CID

**Kind**: instance method of [<code>Client</code>](#Client)  

| Param | Type | Description |
| --- | --- | --- |
| link | <code>string</code> | the CID to remove |

<a name="Client+insights"></a>

### client.insights(link) ⇒ <code>Promise.&lt;object&gt;</code>
**Kind**: instance method of [<code>Client</code>](#Client)  

| Param | Type | Description |
| --- | --- | --- |
| link | [<code>Link</code>](#Link) | the CID to get insights for |

<a name="Link"></a>

## Link : <code>string</code>
A string representing a link to another object in IPLD

**Kind**: global typedef  
<a name="ClientOptions"></a>

## ClientOptions : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| serviceDID | <code>string</code> | The DID of the service to talk to. |
| serviceURL | <code>string</code> | The URL of the service to talk to. |
| settings | <code>Map.&lt;string, any&gt;</code> | A map/db of settings to use for the client. |

