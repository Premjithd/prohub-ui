import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-send-message-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './send-message-dialog.component.html',
  styleUrl: './send-message-dialog.component.scss'
})
export class SendMessageDialogComponent implements OnInit {
  message: string = '';
  loading = false;
  error = '';

  constructor(
    public dialogRef: MatDialogRef<SendMessageDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      recipientName: string;
      recipientId: number;
      jobId: number;
    }
  ) {}

  ngOnInit(): void {}

  sendMessage(): void {
    if (!this.message.trim()) {
      this.error = 'Please enter a message';
      return;
    }

    this.loading = true;
    this.error = '';

    // TODO: Implement actual message sending via a messaging service
    // For now, we'll just simulate the send
    setTimeout(() => {
      this.loading = false;
      this.dialogRef.close({
        sent: true,
        message: this.message,
        recipientId: this.data.recipientId,
        jobId: this.data.jobId
      });
    }, 1000);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
