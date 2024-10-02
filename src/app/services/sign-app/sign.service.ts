import { Injectable } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { from, Observable, of, Subscription, defer, throwError } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
  flatMap,
  mergeMap,
  concatMap,
  map,
  mapTo,
  pluck,
  retry,
  tap,
  mergeAll,
  retryWhen,
  first,
  shareReplay,
} from 'rxjs/operators';
import { Binder, BinderEvent } from './binder.interface';
import { SingleDocument } from './single-document.interface';
import { SignatureInput } from './signature-input.interface';
import { InputRequest } from './input-request.interface';
import { RecordSignatureInput } from './record-signature-input';
import { Store } from '../../state/store';
import { getAllInputs, getCurrentParty, getPartiesWithAnyRole } from '../../state/selectors';
import { EnvInfoService } from '../common/env-info.service';
import { Party, RoleEnum } from './party.interface';
import { DocumentFormatterService } from './document-formatter.service';
import { UserAgentService } from '../common/user-agent.service';
import { SignRequest } from './sign-request.interface';
import { updateBinder, updateHistory } from '../../state/actions/sign';
import { MessageService } from '../../modules/sign-app/message';
import { EventParametersFor, TrackingEventType } from '../../modules/tracking/event-types';
import { TrackingPublisher } from '../../modules/tracking/publisher';
import { setBinderHasContent } from '../../state/actions/uiProps';

@Injectable()
export class SignService {
  constructor(
    private readonly store: Store,
    private readonly http: HttpClient,
    private readonly domSanitization: DomSanitizer,
    private readonly envInfo: EnvInfoService,
    private readonly userAgentService: UserAgentService,
    private readonly messageService: MessageService,
    private readonly eventTracker: TrackingPublisher
  ) {}

  declineSigning(binderId: string, reason?: string, message?: string): Observable<number> {
    const url = this.generateApiUrl(`/${binderId}/requests/declines`);
    const body = {
      reason: reason || '',
      message: message || '',
      data: {
        partyId: getCurrentParty(this.store.getState()).id,
      },
    };

    return this.http.post(url, body, { observe: 'response' }).pipe(pluck('status'));
  }

  cancelSigning(binderId: string, reason?: string, message?: string): Observable<any> {
    return this.getBinder(
      binderId,
      {
        fetchHistory: false,
        fetchPages: false,
        saveStore: true,
      },
      null
    ).pipe(
      flatMap((binderPartial) => {
        if (binderPartial.status === 'REVIEW_AND_SHARE' || binderPartial.status === 'SIGN_IN_PROGRESS') {
          const url = this.generateApiUrl(`/${binderId}/requests/cancellations`);
          const body = {
            reason: reason || '',
            message: message || '',
          };

          return this.http
            .post(url, body, { observe: 'response' })
            .pipe(retryWhen(this.serverErrorRetryStrategy()), pluck('status'));
        }
        return throwError(() => binderPartial.status);
      })
    );
  }

  serverErrorRetryStrategy = ({
    maxRetryAttempts = 3,
  }: {
    maxRetryAttempts?: number;
  } = {}) => {
    return (attempts: Observable<any>) => {
      return attempts.pipe(
        mergeMap((error, i) => {
          const retryAttempt = i + 1;
          if (retryAttempt > maxRetryAttempts || (error.status >= 400 && error.status < 500)) {
            return throwError(() => error);
          }
          return of();
        })
      );
    };
  };

  getFullDocument(binderId: string, print: boolean, getUnsigned?: boolean): Observable<Blob> {
    const headers = new HttpHeaders({
      Accept: 'application/pdf',
    });

    const baseUrl: URL = new URL(this.generateApiUrl(`/${binderId}`));
    return this.http.get(`${baseUrl.href}?pdf`, { headers, responseType: 'blob' }).pipe(shareReplay());
  }

  downloadDocumentAsDocx(binderId: string, documentId: string, getUnsigned?: boolean): Observable<Blob> {
    let url = this.generateApiUrl(`/${binderId}/documents/${documentId}`);
    if (getUnsigned) url += '?unsigned&docx';
    else url += '?docx';
    const headers = new HttpHeaders({
      Accept: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    return this.http.get(`${url}`, { headers, responseType: 'blob' }).pipe(shareReplay());
  }

  // Sequentially downloads all pages of the binder.
  // Note: This modifies binder!
  seqGetBinderPages(binder: Binder, pagesSelectedToFetch = [], oldBinder?: Binder): Subscription {
    return from(binder.documents)
      .pipe(concatMap((doc) => this.seqGetDocPages(binder, doc, pagesSelectedToFetch, oldBinder)))
      .subscribe();
  }

  private seqGetDocPages(binder: Binder, doc: SingleDocument, pagesSelectedToFetch = [], oldBinder?: Binder) {
    // this method fetches all pages by default
    // if pagesSelectedToFetch is provided, then we only fetch pages in that array, and serve the others from the old binder (store)
    // pages are concurrently up to 5 at a time
    const eventSent = false;
    if (!doc.pages) {
      return of(null);
    }
    const observables = doc.pages.map((page) =>
      defer(() => {
        const pageShouldBeFetched = pagesSelectedToFetch.indexOf(page.id) !== -1;
        if (pagesSelectedToFetch.length === 0 || pageShouldBeFetched) return this.getDocPage(binder, doc, page);
        if (!pageShouldBeFetched) {
          const oldDoc = oldBinder.documents.find((oldBinderDocument) => oldBinderDocument.id === doc.id);
          const oldPage = oldDoc.pages.find((oldDocumentPage) => oldDocumentPage.id === page.id);
          // this observable seems pointless
          return of(oldPage.src).pipe(
            tap((url) => {
              // eslint-disable-next-line no-param-reassign
              page.src = url;
              // eslint-disable-next-line no-param-reassign
              page.loaded = true;
            })
          );
        }
      })
    );

    return from(observables).pipe(mergeAll(5));
  }

  event3PagesLoadedEmitted = false;
  pagesLoaded = 0;
  private getDocPage(binder: Binder, doc: SingleDocument, page) {
    return this.getPngData(binder.id, doc.id, page.id).pipe(
      map((data) => URL.createObjectURL(data)),
      map((url) => this.domSanitization.bypassSecurityTrustUrl(url)),
      tap((url) => {
        // eslint-disable-next-line no-param-reassign
        page.src = url;
        // eslint-disable-next-line no-param-reassign
        page.loaded = true;
        this.pagesLoaded += 1;
        if (
          (this.pagesLoaded === 3 || this.pagesLoaded === binder.documents[0].pages.length) &&
          !this.event3PagesLoadedEmitted
        ) {
          this.messageService.sendEvent('NDM_FIRST_3_PAGES_LOADED');
          this.event3PagesLoadedEmitted = true;
        }
      })
    );
  }

  // Each page of a document is an image
  getPngData(binderId: string, documentId: string, pageId: string): Observable<Blob> {
    const url = this.generateApiUrl(`/${binderId}/documents/${documentId}/pages/${pageId}`);
    let headers = new HttpHeaders();
    headers = headers
      .set('Accept', 'image/png')
      .set('Cache-Control', 'no-cache, no-store, must-revalidate')
      .set('Pragma', 'no-cache')
      .set('Expires', '0');

    // forceRetry means we retry the request until we get a success
    // return this.http.request(request, {retries: 20, forceRetry: true})
    //   .pipe(map(res => res));
    return this.http.get(url, { headers, responseType: 'blob' }).pipe(retry(5));
  }

  getBinder(
    binderId: string,
    { fetchPages = false, pagesSelectedToFetch = [], fetchHistory = true, saveStore = true },
    oldBinder?: Binder
  ): Observable<Binder> {
    // if pagesSelectedToFetch is provided, only those pages will be fetched from API (rest will be served from datastore)
    return this.fetchBinder(binderId).pipe(
      map((binder) => {
        this.messageService.sendEvent({ binderData: binder });
        if (fetchPages && pagesSelectedToFetch.length === 0) this.seqGetBinderPages(binder);
        if (fetchPages && pagesSelectedToFetch.length !== 0 && oldBinder)
          this.seqGetBinderPages(binder, pagesSelectedToFetch, oldBinder);
        if (!fetchPages) this.assignOldDocPages(binder);
        if (fetchHistory) this.getDocumentEvents(binderId).subscribe();
        if (saveStore) this.store.dispatch(updateBinder(binder));
        return binder;
      })
    );
  }

  fetchBinder(binderId: string): Observable<Binder> {
    const url = this.generateApiUrl(`/${binderId}`);
    const headers = new HttpHeaders({
      Accept: 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });

    return this.http
      .get<Binder>(url, { headers })
      .pipe(
        map(SignService.formatBinderFromAPI),
        tap((binder) => {
          if (binder &&
            binder.documents.length !== 0 &&
            !!binder.documents.find((d: SingleDocument) => !d.pages || d.pages.length === 0)) {
              this.store.dispatch(setBinderHasContent(false));
            }
            else {
              this.store.dispatch(setBinderHasContent(true));
            }
        })

      );
  }

  fetchHtmlDocument(binderId: string, documentId: string): Observable<string> {
    const headers = new HttpHeaders({ Accept: 'text/html' });
    const url = this.generateApiUrl(`/${binderId}/documents/${documentId}`);

    return this.http.get(url, { headers, responseType: 'text' });
  }

  private assignOldDocPages(binder: Binder) {
    // will take old docPages and assign them to a refreshed binder
    const docsFromStore = this.store.getState().binder.documents;
    // eslint-disable-next-line no-param-reassign
    binder.documents = DocumentFormatterService.copyPagesFromDocuments(docsFromStore, binder.documents);
  }

  getDocumentEvents(binderId: string): Observable<Array<BinderEvent>> {
    const url = this.generateApiUrl(`/${binderId}/events`);
    return this.http.get<Array<BinderEvent>>(url).pipe(
      tap((res) => {
        this.store.dispatch(updateHistory(res));
      })
    );
  }

  submitSignatures(binder: Binder): Observable<void> {
    const path = `/${binder.id}/requests/signatures`;
    const url = this.generateApiUrl(path);
    const body: InputRequest = this.buildBody(binder.documents);
    const headers = SignService.buildHeaders();

    return this.http.post(url, body, { headers }).pipe(mapTo(undefined));
  }

  sendReminder(parties: Array<Party>, binderId: string, message?: string): Observable<void> {
    const path = `/${binderId}/requests/reminders`;
    const url = this.generateApiUrl(path);
    const headers = SignService.buildHeaders();
    const recipients = parties.map((p) => {
      return { partyId: p.id };
    });
    const messages = {
      signer: 'This is to remind you that you have one document awaiting for your signature',
      viewer: 'This is to remind you that you have one document waiting to be reviewed',
    };
    let defaultMessage = messages.signer;
    const isViewer = parties[0].roles.find((r) => r === RoleEnum.Viewer);
    if (isViewer) {
      defaultMessage = messages.viewer;
    }
    const body = {
      message: message || defaultMessage,
      recipients,
    };

    return this.http.post(url, body, { headers }).pipe(mapTo(undefined));
  }

  sendNewViewer(
    { legalName, email }: Pick<Party, 'email' | 'legalName'>,
    binderId: string,
    message?: string
  ): Observable<void> {
    const path = `/${binderId}/requests/viewers`;
    const url = this.generateApiUrl(path);
    const headers = SignService.buildHeaders();
    const reference = `viewer-${email}`;
    const body = {
      notification: true,
      message,
      party: {
        reference,
        legalName,
        email,
      },
    };

    return this.http.post(url, body, { headers }).pipe(mapTo(undefined));
  }

  removeViewer(partyId: string, binderId: string): Observable<void> {
    const path = `/${binderId}/parties/${partyId}`;
    const url = this.generateApiUrl(path);
    const headers = SignService.buildHeaders();

    return this.http.delete(url, { headers }).pipe(mapTo(undefined));
  }

  sendInvitations(binderId: string, msg?: string): Observable<void> {
    const path = `/${binderId}/requests/invitations`;
    const url = this.generateApiUrl(path);
    const headers = SignService.buildHeaders();
    const body = {
      message: msg || '',
    };

    return this.http.post(url, body, { headers }).pipe(mapTo(undefined));
  }

  sendFinalisation(msg: string, binder: Binder): Observable<SignRequest> {
    const path = `/${binder.id}/requests/finalisations`;
    const url = this.generateApiUrl(path);
    const headers = SignService.buildHeaders();
    const body = {
      message: msg || '',
    };

    return this.http
      .post<SignRequest>(url, body, { headers })
      .pipe(
        tap(() => {
          const updatedBinder: Binder = { ...binder, status: 'REVIEW_AND_SHARE' };
          this.messageService.sendEvent({
            eventName: 'BINDER_FINALISED',
            binder: updatedBinder,
            category: 'SignEvent',
          });
        })
      );
  }

  editParties(parties: Party[], binderId: string): Observable<Binder> {
    const path = `/${binderId}`;
    const url = this.generateApiUrl(path);
    const headers = new HttpHeaders({
      Accept: 'application/json',
      'Content-Type': 'application/merge-patch+json',
    });
    const body = {
      parties,
    };

    return this.http.patch<Binder>(url, body, { headers });
  }

  private static formatPartyForAPI(party: Party): Omit<Party, 'emailChanged' | 'isTemporary' | 'status'> {
    // if party is temporary it means it was locally generated and any ID should be removed (i.e. this party does not exist in SignAPI)
    return {
      id: party.isTemporary || party.emailChanged ? null : party.id,
      reference: party.reference,
      legalName: party.legalName,
      jobTitle: party.jobTitle || 'NO_JOB_TITLE_PROVIDED_BY_CLIENT',
      email: party.email,
      personId: party.personId,
      roles: party.roles,
      metaData: party.metaData,
    };
  }

  private static formatPartyFromAPI(party: Party): Party {
    // parties from the API have no isTemporary property, so add it here
    return {
      ...party,
      isTemporary: party.isTemporary ?? false,
      emailChanged: false,
    };
  }

  private static formatBinderFromAPI(binderResponse: Binder): Binder {
    // add any additional binder properties which don't come from the API here
    return {
      ...binderResponse,
      parties: binderResponse.parties.map(SignService.formatPartyFromAPI),
    };
  }

  updateBinder(binder?: Binder, saveStore = false): Observable<Binder> {
    if (binder === undefined) {
      return this.updateBinder(this.store.getState().binder, true);
    }
    return this.updateBinderPartial(binder, saveStore);
  }

  updateBinderPartial(binder: Partial<Binder>, saveStore = false): Observable<Binder> {
    const path = `/${binder.id}`;
    const url = this.generateApiUrl(path);
    const headers = new HttpHeaders({
      Accept: 'application/json',
      'Content-Type': 'application/merge-patch+json',
    });
    const parties = getPartiesWithAnyRole(binder);
    const inputs = getAllInputs({ binder });
    const body = {
      documents: binder.documents && binder.documents.map((doc) => DocumentFormatterService.format(doc, inputs)),
      parties: parties.map((party) => SignService.formatPartyForAPI(party)),
      metaData: binder.metaData,
    };

    return this.http
      .patch<Binder>(url, body, { headers })
      .pipe(
        tap((newBinder) => {
          if (saveStore) {
            this.assignOldDocPages(newBinder);
            const completeBinder = SignService.formatBinderFromAPI(newBinder);
            this.store.dispatch(updateBinder(completeBinder));
          }
        })
      );
  }

  updateParty(binderId: string, partyData: Party): Observable<void> {
    const path = `/${binderId}/parties/${partyData.id}`;
    const url = this.generateApiUrl(path);
    const headers = new HttpHeaders({
      Accept: 'application/json',
      'Content-Type': 'application/merge-patch+json',
    });
    const partyWithoutReadonlyProperties = SignService.formatPartyForAPI(partyData);
    return this.http.patch(url, partyWithoutReadonlyProperties, { headers }).pipe(mapTo(undefined));
  }

  deleteParty(binderId: string, party: string | Party): Observable<void> {
    const id = typeof party === 'string' ? party : party.id;
    const path = `/${binderId}/parties/${id}`;
    const url = this.generateApiUrl(path);
    const headers = new HttpHeaders({
      Accept: 'application/json',
      'Content-Type': 'application/merge-patch+json',
    });
    return this.http.delete(url, { headers }).pipe(mapTo(undefined));
  }

  download(binder: Binder, fileExtension: '.docx' | '.pdf'): Observable<Blob> {
    const reader = new FileReader();
    this.messageService.sendEvent({
      eventName: 'DOCUMENT_DOWNLOADED',
      binder,
      category: 'SignEvent',
    });

    const docBlob =
      fileExtension === '.pdf'
        ? this.getFullDocument(binder.id, false)
        : this.downloadDocumentAsDocx(binder.id, binder.documents[0].id);

    function createObjectURL(file) {
      if ((<any>window).webkitURL) {
        return (<any>window).webkitURL.createObjectURL(file);
      }
      if ((<any>window).URL && window.URL.createObjectURL) {
        return (<any>window).URL.createObjectURL(file);
      }
      return null;
    }

    docBlob.pipe(first()).subscribe((blob) => {
      const docName = binder.documents[0].name + fileExtension;
      const fileData = [blob];
      const blobObject = new Blob(fileData);
      const trackingParameters: EventParametersFor<TrackingEventType.FileDownload> = {
        cause: 'auto',
        linkURL: URL?.createObjectURL(blob),
        fileName: docName,
        fileExtension,
      };
      URL?.revokeObjectURL(trackingParameters.linkURL);
      if ((<any>window).navigator.msSaveOrOpenBlob) {
        if ((<any>window).navigator.msSaveOrOpenBlob(blobObject, docName)) {
          this.eventTracker.fileDownload(trackingParameters);
        }
      } else {
        const objUrl = createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.setAttribute('type', 'hidden');
        anchor.setAttribute('download', docName);
        // FF requires the element exists in the DOM
        document.body.appendChild(anchor);
        anchor.href = objUrl;
        anchor.click();
        this.eventTracker.fileDownload(trackingParameters);
      }

      // emit the download data as a postMessage
      reader.addEventListener('loadend', (e) => {
        this.messageService.sendEvent({ downloadFullDoc: (<any>e).srcElement.result });
      });
      reader.readAsText(blob);

      this.getDocumentEvents(binder.id).subscribe();
    });

    return docBlob;
  }

  updateDocument(
    binderId: string,
    documentId: string,
    data: Partial<SingleDocument>,
    updatingDocumentContent = false
  ): Observable<SingleDocument> {
    const path = `/${binderId}/documents/${documentId}`;
    const url = this.generateApiUrl(path);
    let headers;
    if (!updatingDocumentContent) {
      headers = new HttpHeaders({
        Accept: 'application/json',
        'Content-Type': 'application/merge-patch+json',
      });
    } else {
      headers = new HttpHeaders({
        'Content-Type': 'text/html',
      });
    }
    const body = data;

    if (updatingDocumentContent) return this.http.put<SingleDocument>(url, body, { headers });
    return this.http.patch<SingleDocument>(url, body, { headers });
  }
  private buildBody(documents: SingleDocument[]): InputRequest {
    return {
      data: {
        signatures: documents
          .filter((doc) => doc.signable && doc.inputs.length > 0)
          .reduce((acc, doc) => acc.concat(doc.inputs), new Array<SignatureInput>()) // flatMap
          .filter((input) => input.value && (input.status === 'PENDING' || input.status === 'DECLINED'))
          .map((input) => this.submitInputMapper(input)),
      },
    };
  }

  private submitInputMapper(input: SignatureInput): RecordSignatureInput {
    const record: RecordSignatureInput = {
      id: input.id,
      value: input.value,
      type: input.valueType,
      userAgent: this.userAgentService.getUserAgent(),
      host: '192.168.0.1',
    };

    if (input.valueType === 'TEXT') {
      record.font = input.font;
    }
    return record;
  }

  private generateApiUrl(path: string): string {
    return this.envInfo.getBindersBaseUrl() + path;
  }

  private static buildHeaders() {
    const headers = new HttpHeaders();
    headers.set('Accept', 'application/json');
    headers.set('Content-Type', 'application/json');
    return headers;
  }
}
