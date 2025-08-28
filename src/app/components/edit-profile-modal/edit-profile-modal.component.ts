import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-edit-profile-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './edit-profile-modal.component.html',
  styleUrl: './edit-profile-modal.component.scss'
})
export class EditProfileModalComponent implements OnInit {
  profileForm: FormGroup;
  currentUser: User | null = null;
  isLoading = false;
  isInitialLoading = true;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    public dialogRef: MatDialogRef<EditProfileModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.profileForm = this.fb.group({
      first_name: ['', [Validators.required]],
      last_name: ['', [Validators.required]],
      phone: [''],
      address: [''],
      city: [''],
      province: ['']
    });
  }

  ngOnInit(): void {
    // Load current user data and populate form
    setTimeout(() => {
      this.currentUser = this.authService.currentUser;
      if (this.currentUser) {
        this.profileForm.patchValue({
          first_name: this.currentUser.first_name || '',
          last_name: this.currentUser.last_name || '',
          phone: this.currentUser.phone || '',
          address: this.currentUser.address || '',
          city: this.currentUser.city || '',
          province: this.currentUser.province || ''
        });
      }
      this.isInitialLoading = false;
    }, 800);
  }

  closeModal(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.profileForm.valid && !this.isLoading) {
      this.isLoading = true;
      
      const updatedProfile = this.profileForm.value;

      console.log('Updating profile:', updatedProfile);
      
      // Call the actual AuthService updateProfile method
      this.authService.updateProfile(updatedProfile).subscribe({
        next: (updatedUser) => {
          this.isLoading = false;
          
          // Close modal with updated data
          this.dialogRef.close({
            updated: true,
            data: updatedUser
          });
          
          // Show success message
          console.log('Perfil actualizado exitosamente');
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Error updating profile:', error);
          // Could show error message to user here
        }
      });
    }
  }
}
