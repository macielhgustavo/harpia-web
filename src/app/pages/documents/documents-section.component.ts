import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import {
  Component,
  ElementRef,
  Input,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Download,
  File,
  FilePlus2,
  LucideAngularModule,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-angular';
import { APP_PERMISSIONS } from '../../core/config/rbac.config';
import {
  Document,
  DocumentCategory,
  DocumentFilters,
} from '../../core/models/document.model';
import { AuthorizationService } from '../../core/services/authorization.service';
import {
  DocumentService,
  filenameFromContentDisposition,
} from '../../core/services/document.service';
import { formatDate } from '../../shared/utils/development';
import { extractError } from '../../shared/utils/http-error';

export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;
export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
] as const;

@Component({
  selector: 'app-documents-section',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  templateUrl: './documents-section.component.html',
})
export class DocumentsSectionComponent implements OnInit {
  private readonly documentService = inject(DocumentService);
  private readonly authorization = inject(AuthorizationService);
  private loadSequence = 0;
  private focusHeadingOnLoad = false;
  private deleteTrigger: HTMLElement | null = null;

  @Input() title = 'Documentos';
  @Input() personId = '';
  @Input() investmentId = '';
  @Input() unitId = '';
  @Input() developmentId = '';

  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('nameInput') private nameInput?: ElementRef<HTMLInputElement>;
  @ViewChild('uploadButton')
  private uploadButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('sectionHeading')
  private sectionHeading?: ElementRef<HTMLHeadingElement>;
  @ViewChild('deleteConfirmation')
  private deleteConfirmation?: ElementRef<HTMLElement>;

  readonly documents = signal<Document[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly feedback = signal('');
  readonly actionError = signal('');
  readonly search = signal('');
  readonly categoryFilter = signal<DocumentCategory | ''>('');
  readonly uploadOpen = signal(false);
  readonly uploading = signal(false);
  readonly uploadSubmitted = signal(false);
  readonly uploadError = signal('');
  readonly selectedFile = signal<File | null>(null);
  readonly downloadingId = signal<string | null>(null);
  readonly deleteTarget = signal<Document | null>(null);
  readonly deleting = signal(false);
  readonly deleteError = signal('');

  name = '';
  category: DocumentCategory = 'OUTRO';

  readonly canWrite = this.authorization.hasPermission(
    APP_PERMISSIONS.DOCUMENTS_WRITE,
  );
  readonly categoryOptions: ReadonlyArray<{
    value: DocumentCategory;
    label: string;
  }> = [
    { value: 'CONTRATO', label: 'Contrato' },
    { value: 'COMPROVANTE', label: 'Comprovante' },
    { value: 'OUTRO', label: 'Outro' },
  ];
  readonly accept = ALLOWED_DOCUMENT_MIME_TYPES.join(',');
  readonly formatDate = formatDate;

  readonly FileIcon = File;
  readonly AddIcon = FilePlus2;
  readonly UploadIcon = Upload;
  readonly DownloadIcon = Download;
  readonly DeleteIcon = Trash2;
  readonly RetryIcon = RefreshCw;
  readonly SearchIcon = Search;
  readonly CloseIcon = X;

  readonly filteredDocuments = computed(() => {
    const query = this.normalize(this.search());
    const category = this.categoryFilter();
    return this.documents().filter(
      (document) =>
        (!category || document.category === category) &&
        (!query ||
          this.normalize(document.name).includes(query) ||
          this.normalize(document.originalName).includes(query) ||
          this.normalize(document.mimeType).includes(query)),
    );
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    const filters = this.filters();
    if (!Object.keys(filters).length) {
      this.loading.set(false);
      this.loadError.set('Vínculo inválido para listar documentos.');
      return;
    }
    const sequence = ++this.loadSequence;
    this.loading.set(true);
    this.loadError.set('');
    this.documentService.list(filters).subscribe({
      next: (documents) => {
        if (sequence !== this.loadSequence) return;
        this.documents.set(documents);
        this.loading.set(false);
        this.restoreHeadingIfNeeded();
      },
      error: (error: unknown) => {
        if (sequence !== this.loadSequence) return;
        this.loading.set(false);
        this.loadError.set(
          extractError(error, 'Não foi possível carregar os documentos.'),
        );
        this.restoreHeadingIfNeeded();
      },
    });
  }

  resetFilters(): void {
    this.search.set('');
    this.categoryFilter.set('');
  }

  openUpload(): void {
    if (!this.canWrite || this.uploading()) return;
    this.resetUploadForm();
    this.feedback.set('');
    this.actionError.set('');
    this.uploadOpen.set(true);
    queueMicrotask(() => this.nameInput?.nativeElement.focus());
  }

  closeUpload(): void {
    if (this.uploading()) return;
    this.uploadOpen.set(false);
    this.resetUploadForm();
    queueMicrotask(() => this.uploadButton?.nativeElement.focus());
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile.set(file);
    this.uploadError.set('');
    if (file && !this.name.trim()) {
      this.name = file.name.replace(/\.[^.]+$/, '');
    }
    const error = this.fileValidationError(file);
    if (error) this.uploadError.set(error);
  }

  upload(): void {
    this.uploadSubmitted.set(true);
    const file = this.selectedFile();
    const fileError = this.fileValidationError(file);
    if (!this.name.trim() || fileError || !file || this.uploading()) {
      if (fileError) this.uploadError.set(fileError);
      if (!this.name.trim())
        queueMicrotask(() => this.nameInput?.nativeElement.focus());
      return;
    }

    this.uploading.set(true);
    this.uploadError.set('');
    this.documentService
      .upload({
        ...this.filters(),
        name: this.name.trim(),
        category: this.category,
        file,
      })
      .subscribe({
        next: () => {
          this.uploading.set(false);
          this.uploadOpen.set(false);
          this.resetUploadForm();
          this.feedback.set('Documento enviado com sucesso.');
          this.focusHeadingOnLoad = true;
          this.reload();
        },
        error: (error: unknown) => {
          this.uploading.set(false);
          this.uploadError.set(
            extractError(error, 'Não foi possível enviar o documento.'),
          );
        },
      });
  }

  download(document: Document): void {
    if (this.downloadingId()) return;
    this.actionError.set('');
    this.downloadingId.set(document.id);
    this.documentService.download(document.id).subscribe({
      next: (response) => {
        this.downloadingId.set(null);
        if (!response.body) {
          this.actionError.set('O arquivo retornado está vazio.');
          return;
        }
        this.saveResponse(response, document.originalName);
      },
      error: (error: unknown) => {
        this.downloadingId.set(null);
        this.actionError.set(
          extractError(error, 'Não foi possível baixar o documento.'),
        );
      },
    });
  }

  requestDelete(document: Document): void {
    if (!this.canWrite) return;
    this.deleteTrigger =
      window.document.activeElement instanceof HTMLElement
        ? window.document.activeElement
        : null;
    this.deleteTarget.set(document);
    this.deleteError.set('');
    queueMicrotask(() => this.deleteConfirmation?.nativeElement.focus());
  }

  closeDelete(): void {
    if (this.deleting()) return;
    this.deleteTarget.set(null);
    this.deleteError.set('');
    const trigger = this.deleteTrigger;
    this.deleteTrigger = null;
    queueMicrotask(() => {
      if (trigger?.isConnected) trigger.focus();
    });
  }

  confirmDelete(): void {
    const document = this.deleteTarget();
    if (!this.canWrite || !document || this.deleting()) return;
    this.deleting.set(true);
    this.documentService.remove(document.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.deleteTrigger = null;
        this.feedback.set('Documento excluído com sucesso.');
        this.focusHeadingOnLoad = true;
        this.reload();
      },
      error: (error: unknown) => {
        this.deleting.set(false);
        if ((error as HttpErrorResponse).status === 404) {
          this.deleteTarget.set(null);
          this.deleteTrigger = null;
          this.feedback.set(
            'O documento não existe mais. A lista será atualizada.',
          );
          this.focusHeadingOnLoad = true;
          this.reload();
          return;
        }
        this.deleteError.set(
          extractError(error, 'Não foi possível excluir o documento.'),
        );
      },
    });
  }

  categoryLabel(category: DocumentCategory): string {
    return (
      this.categoryOptions.find((option) => option.value === category)?.label ??
      category
    );
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private filters(): DocumentFilters {
    return {
      ...(this.personId ? { personId: this.personId } : {}),
      ...(this.investmentId ? { investmentId: this.investmentId } : {}),
      ...(this.unitId ? { unitId: this.unitId } : {}),
      ...(this.developmentId ? { developmentId: this.developmentId } : {}),
    };
  }

  private fileValidationError(file: File | null): string {
    if (!file) return 'Selecione um arquivo.';
    if (file.size > MAX_DOCUMENT_BYTES) {
      return 'O arquivo não pode exceder 25 MB.';
    }
    if (
      !(ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(file.type)
    ) {
      return 'Tipo não permitido. Use PDF, DOCX, XLSX, PNG ou JPEG.';
    }
    return '';
  }

  private resetUploadForm(): void {
    this.name = '';
    this.category = 'OUTRO';
    this.selectedFile.set(null);
    this.uploadSubmitted.set(false);
    this.uploadError.set('');
    if (this.fileInput) this.fileInput.nativeElement.value = '';
  }

  private saveResponse(response: HttpResponse<Blob>, fallback: string): void {
    const name = filenameFromContentDisposition(
      response.headers.get('Content-Disposition'),
      fallback,
    );
    const url = URL.createObjectURL(response.body!);
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.style.display = 'none';
    window.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  private restoreHeadingIfNeeded(): void {
    if (!this.focusHeadingOnLoad) return;
    this.focusHeadingOnLoad = false;
    queueMicrotask(() => this.sectionHeading?.nativeElement.focus());
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLocaleLowerCase('pt-BR');
  }
}
