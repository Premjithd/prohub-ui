import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { Router, ActivatedRoute } from '@angular/router';
import { JobService, Message } from '../../services/job.service';
import { Auth } from '../../core/services/auth';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface ConversationSummary {
  userId: number;
  userName: string;
  userEmail: string;
  userType: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  profileImage?: string;
}

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatDividerModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatBadgeModule
  ],
  templateUrl: './messages.html',
  styleUrl: './messages.scss'
})
export class MessagesComponent implements OnInit, OnDestroy {
  conversations: ConversationSummary[] = [];
  selectedConversation: ConversationSummary | null = null;
  messages: Message[] = [];
  
  loading = true;
  loadingMessages = false;
  errorMessage = '';
  successMessage = '';
  messageText = '';
  messageSending = false;
  
  currentUserId: number = 0;
  private destroy$ = new Subject<void>();
  private messagePollInterval = 3000; // Poll every 3 seconds
  private highlightPartnerId: number | null = null;

  constructor(
    private jobService: JobService,
    public auth: Auth,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {
    const userId = this.auth.getUserId();
    this.currentUserId = typeof userId === 'string' ? parseInt(userId, 10) : (userId || 0);
  }

  ngOnInit(): void {
    // Check if user is authenticated
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/auth/login']);
      return;
    }

    // Check for partnerId query parameter to highlight a conversation
    this.activatedRoute.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['partnerId']) {
        this.highlightPartnerId = parseInt(params['partnerId'], 10);
        console.log('Query param partnerId found:', this.highlightPartnerId);
        // Reload conversations to highlight the partner
        this.loadConversations();
      } else if (!this.conversations.length && this.loading === false) {
        // Only load if not already loading and no conversations yet
        this.loadConversations();
      }
    });

    // Initial load if no query params
    if (!this.activatedRoute.snapshot.queryParams['partnerId']) {
      this.loadConversations();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadConversations(): void {
    this.loading = true;
    this.errorMessage = '';

    const userType = this.auth.getUserType() || 'User';

    // Get conversation partners with user details
    this.jobService.getConversationPartners(userType)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (partners) => {
          this.conversations = partners;
          this.loading = false;
          this.cdr.markForCheck();

          // Auto-select and highlight the conversation if partnerId was provided
          if (this.highlightPartnerId) {
            const targetConversation = partners.find(p => p.userId === this.highlightPartnerId);
            if (targetConversation) {
              this.selectConversation(targetConversation);
            }
          }
        },
        error: (error) => {
          console.error('Error loading conversations:', error);
          this.errorMessage = 'Failed to load conversations. Please try again.';
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  selectConversation(conversation: ConversationSummary): void {
    this.selectedConversation = conversation;
    this.loadMessagesForConversation(conversation.userId);
    conversation.unreadCount = 0;
  }

  loadMessagesForConversation(userId: number): void {
    this.loadingMessages = true;
    this.errorMessage = '';

    this.jobService.getMessagesWithUser(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (messages) => {
          this.messages = messages;
          // Mark all messages as read
          this.markMessagesAsRead(messages);
          this.loadingMessages = false;
          this.cdr.markForCheck();
          // Scroll to bottom
          setTimeout(() => this.scrollToBottom(), 100);
        },
        error: (error) => {
          console.error('Error loading messages:', error);
          this.errorMessage = 'Failed to load messages.';
          this.loadingMessages = false;
          this.cdr.markForCheck();
        }
      });
  }

  sendMessage(): void {
    if (!this.messageText.trim() || !this.selectedConversation) {
      return;
    }

    this.messageSending = true;
    this.errorMessage = '';

    const message: Message = {
      id: 0,
      senderId: this.currentUserId,
      recipientId: this.selectedConversation.userId,
      senderType: this.auth.getUserType() || 'User',
      content: this.messageText,
      sentAt: new Date().toISOString(),
      isRead: false
    };

    this.jobService.sendDirectMessage(message)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messages.push(message);
          this.messageText = '';
          this.messageSending = false;
          this.cdr.markForCheck();
          setTimeout(() => this.scrollToBottom(), 100);
          // Refresh conversations list to update last message
          this.loadConversations();
        },
        error: (error) => {
          console.error('Error sending message:', error);
          this.errorMessage = 'Failed to send message.';
          this.messageSending = false;
          this.cdr.markForCheck();
        }
      });
  }

  private markMessagesAsRead(messages: Message[]): void {
    messages
      .filter(msg => msg.recipientId === this.currentUserId && !msg.isRead)
      .forEach(msg => {
        this.jobService.markMessageAsRead(msg.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            error: (error) => console.error('Error marking message as read:', error)
          });
      });
  }

  private scrollToBottom(): void {
    const messagesContainer = document.querySelector('.messages-list');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  getFormattedTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }

  getSenderName(message: Message): string {
    return message.senderId === this.currentUserId ? 'You' : message.senderType;
  }

  isSentByCurrentUser(message: Message): boolean {
    return message.senderId === this.currentUserId;
  }

  closeConversation(): void {
    this.selectedConversation = null;
    this.messages = [];
  }
}