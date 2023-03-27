export class File extends Blob {
  /**
   * @param {BlobPart[]} blobParts
   * @param {string} name
   */
  constructor (blobParts, name) {
    super(blobParts)
    this.name = name
  }
}
