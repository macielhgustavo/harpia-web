import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  inject,
} from '@angular/core';
import { AppPermission } from '../../core/config/rbac.config';
import { AuthorizationService } from '../../core/services/authorization.service';

/** Structural UX helper. The backend remains the authorization boundary. */
@Directive({
  selector: '[appHasPermission]',
  standalone: true,
})
export class HasPermissionDirective {
  private readonly template = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly authorization = inject(AuthorizationService);
  private rendered = false;

  @Input({ required: true })
  set appHasPermission(permission: AppPermission) {
    this.updateView(this.authorization.hasPermission(permission));
  }

  private updateView(allowed: boolean): void {
    if (allowed && !this.rendered) {
      this.viewContainer.createEmbeddedView(this.template);
      this.rendered = true;
      return;
    }

    if (!allowed && this.rendered) {
      this.viewContainer.clear();
      this.rendered = false;
    }
  }
}
