import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface FAQItem {
  question: string;
  answer: string;
  open: boolean;
}

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './faq.html',
  styleUrls: ['./faq.scss']
})
export class FAQComponent {
  faqItems: FAQItem[] = [
    {
      question: 'What is ProHub?',
      answer: 'ProHub is a marketplace platform that connects customers with verified local professionals. Whether you need plumbing, electrical work, house cleaning, tutoring, or any other service, ProHub makes it easy to find, hire, and manage trusted professionals in your area.',
      open: false
    },
    {
      question: 'How do I post a job?',
      answer: 'To post a job, first create a user account on ProHub. Then navigate to "Post a Job" from your dashboard, describe your project, set your budget, and specify your location. Within minutes, qualified professionals will start sending you bids.',
      open: false
    },
    {
      question: 'How much does it cost to use ProHub?',
      answer: 'For customers, posting jobs and receiving bids is completely free. ProHub charges professionals (Pros) a small commission on completed jobs. There are no hidden fees for customers using our platform.',
      open: false
    },
    {
      question: 'How do I become a Pro?',
      answer: 'To become a Pro, sign up with a Pro account on ProHub. You\'ll need to provide your business information, verify your identity, and upload documentation of your credentials and insurance. Once approved, you can start bidding on jobs in your service area.',
      open: false
    },
    {
      question: 'Are professionals on ProHub verified?',
      answer: 'Yes! All professionals on ProHub go through an identity verification process. We verify their credentials, check background information, and maintain a rating system based on customer reviews. This ensures you\'re working with trustworthy professionals.',
      open: false
    },
    {
      question: 'How are payments handled?',
      answer: 'Payments on ProHub are secured through our escrow system. When you accept a bid, funds are held securely. The professional receives payment only after you confirm the work is complete. This protects both customers and professionals.',
      open: false
    },
    {
      question: 'What if I\'m not satisfied with the work?',
      answer: 'We take quality seriously. If you\'re not satisfied with the work, you can dispute the job within 7 days. Our support team will review the situation and work with both parties to reach a fair resolution. You can also leave honest reviews to help other customers.',
      open: false
    },
    {
      question: 'Can I communicate directly with professionals?',
      answer: 'Absolutely! ProHub provides in-app messaging so you can communicate with professionals before, during, and after the job. This allows you to discuss project details, ask questions, and stay updated on progress.',
      open: false
    },
    {
      question: 'How is my personal information protected?',
      answer: 'We take data security very seriously. ProHub uses industry-standard encryption to protect your personal and payment information. We never share your details with third parties without your consent. Read our Privacy Policy for more details.',
      open: false
    },
    {
      question: 'What service categories are available?',
      answer: 'ProHub offers a wide range of service categories including Home Repair, Cleaning, Tutoring, IT Support, Photography, Writing, Graphic Design, and many more. Browse our services page to see all available categories and find what you need.',
      open: false
    },
    {
      question: 'How do I leave a review?',
      answer: 'After a job is completed, both customers and professionals can leave reviews. You\'ll receive a notification to rate your experience. Your honest feedback helps maintain quality on the platform and helps others make informed decisions.',
      open: false
    },
    {
      question: 'What if I have more questions?',
      answer: 'We\'re here to help! Visit our Contact page to reach our support team, or check out our Help Center for additional resources. You can also email us at support@prohub.com or call our customer support line.',
      open: false
    }
  ];

  toggleFAQ(index: number): void {
    this.faqItems[index].open = !this.faqItems[index].open;
  }
}
