import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { APP_PERMISSIONS, AppPermission } from '../../core/config/rbac.config';
import { AuthorizationService } from '../../core/services/authorization.service';
import { HasPermissionDirective } from './has-permission.directive';

@Component({
  standalone: true,
  imports: [HasPermissionDirective],
  template: `<span *appHasPermission="permission">Permitido</span>`,
})
class HostComponent {
  permission: AppPermission = APP_PERMISSIONS.USERS_MANAGE;
}

describe('HasPermissionDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let authorization: jasmine.SpyObj<AuthorizationService>;

  beforeEach(() => {
    authorization = jasmine.createSpyObj<AuthorizationService>(
      'AuthorizationService',
      ['hasPermission'],
    );

    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: AuthorizationService, useValue: authorization }],
    });
  });

  it('renders content when the UX permission is granted', () => {
    authorization.hasPermission.and.returnValue(true);
    fixture = TestBed.createComponent(HostComponent);

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Permitido');
  });

  it('hides content when permission is denied and reacts to input changes', () => {
    authorization.hasPermission.and.callFake(
      (permission) => permission === APP_PERMISSIONS.USERS_MANAGE,
    );
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Permitido');

    fixture.componentInstance.permission = APP_PERMISSIONS.PEOPLE_READ;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Permitido');
  });
});
