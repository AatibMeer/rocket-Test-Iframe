import { Injectable } from '@angular/core';
import { SingleDocument, SingleDocumentMutablePropertiesOnly } from './single-document.interface';
import { SignatureInput } from './signature-input.interface';
import { tempUUIDPrefix } from '../../modules/sign-app/toolbox-tooltip/toolbox-tooltip.component';

// allows changing of SingleDocument's readonly properties. For internal creation use only!
type SingleDocumentMutable = {
  -readonly [K in keyof SingleDocument]: SingleDocument[K];
};

@Injectable()
export class DocumentFormatterService {
  /**
   * Copy the pages array from one document to another. Creates a NEW SingleDocument with the properties of
   * <code>to</code> and a copy of the pages objects of <code>from</code>. It does not modify the pages array of
   * <code>to</code>.
   */
  static copyPagesFromDocument(from: SingleDocument, to: SingleDocument): SingleDocument {
    return {
      ...to,
      pages: from.pages.map((page) => ({
        ...page,
      })),
    };
  }

  /**
   * Copy the pages array from a collection of documents to the equivalent document in another array. Documents with the
   * same <code>id</code> property are considered equivalent. Creates a NEW array of NEW SingleDocuments with a copy of
   * the pages objects. It does not modify the original arrays or the documents inside.
   */
  static copyPagesFromDocuments(from: SingleDocument[], to: SingleDocument[]): SingleDocument[] {
    return to.map((document) => {
      const documentToCopy = from.find((candidateDoc) => candidateDoc.id === document.id);
      return this.copyPagesFromDocument(documentToCopy ?? document, document);
    });
  }

  static format(document: SingleDocument, inputs: SignatureInput[]): SingleDocumentMutablePropertiesOnly {
    const docPagesIds = document.pages.map(p => p.id);
    const inputsOnThisDocument = inputs.filter((i) => docPagesIds.includes(i.position.pageId));
    const mutableDocument: SingleDocumentMutable = {
      ...document,
      inputs: DocumentFormatterService.formatInputs(inputsOnThisDocument),
    };
    // the API will reject a request with documents which have these properties, so delete them.
    delete mutableDocument.originalContentChecksum;
    delete mutableDocument.pages;
    delete mutableDocument.contentType;
    delete mutableDocument.version;
    return mutableDocument;
  }

  static formatInputs(inputs: SignatureInput[]): Array<SignatureInput> {
    return inputs.map((input) => {
      const inputFont = {
        ...input.font,
        sizeInPx: input.font ? input.font.sizeInPx : 16,
        type: input.font ? input.font.type : 'CAVEAT_REGULAR',
      };
      if (input.position.type === 'PLACEHOLDER') {
        return {
          id: DocumentFormatterService.isTemporaryUUID(input.id) ? null : input.id,
          type: input.type,
          partyReference: input.partyReference,
          prompt: input.prompt,
          optional: input.optional,
          font: inputFont,
          position: {
            identifier: input.position.identifier,
            type: input.position.type,
            width: input.position.width,
            height: input.position.height,
            hAlignment: input.position.hAlignment,
            vAlignment: input.position.vAlignment,
            unit: 'PCT',
          },
        };
      }
      return {
        id:
          DocumentFormatterService.isTemporaryUUID(input.id) || input.position.type === 'SIGNATURE_PAGE'
            ? null
            : input.id,
        type: input.type,
        partyReference: input.partyReference,
        prompt: input.prompt,
        optional: input.optional,
        font: inputFont,
        position: {
          type: input.position.type,
          pageId: input.position.pageId,
          xOffset: input.position.xOffset,
          yOffset: input.position.yOffset,
          width: input.position.width,
          height: input.position.height,
          vAlignment: input.position.vAlignment,
          hAlignment: input.position.hAlignment,
          unit: 'PCT',
        },
      };
    });
  }

  private static isTemporaryUUID(uuid = ''): boolean {
    return uuid.includes(tempUUIDPrefix);
  }
}
