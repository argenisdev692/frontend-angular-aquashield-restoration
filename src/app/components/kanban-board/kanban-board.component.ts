import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { AvatarModule } from 'primeng/avatar';
import { TagModule } from 'primeng/tag';

interface KanbanCard {
  id: string;
  title: string;
  description: string;
  tag: string;
  priority: 'low' | 'medium' | 'high';
  assignee: string;
  assigneeInitials: string;
}

interface KanbanColumn {
  id: string;
  title: string;
  accent: string;
  cards: KanbanCard[];
}

@Component({
  selector: 'app-kanban-board',
  imports: [CommonModule, DragDropModule, AvatarModule, TagModule],
  templateUrl: './kanban-board.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './kanban-board.component.css',
})
export class KanbanBoardComponent {
  columns = signal<KanbanColumn[]>([
    {
      id: 'todo',
      title: 'To Do',
      accent: 'var(--accent-warning)',
      cards: [
        {
          id: '1',
          title: 'Review insurance claim #4452',
          description: 'Verify damage assessment photos and policy coverage.',
          tag: 'Claims',
          priority: 'high',
          assignee: 'Sarah Johnson',
          assigneeInitials: 'SJ',
        },
        {
          id: '2',
          title: 'Schedule site inspection',
          description: 'Coordinate with property owner for water damage inspection.',
          tag: 'Field Work',
          priority: 'medium',
          assignee: 'Mike Chen',
          assigneeInitials: 'MC',
        },
        {
          id: '3',
          title: 'Update client contact info',
          description: 'Refresh phone and email for ABC Restoration contract.',
          tag: 'Admin',
          priority: 'low',
          assignee: 'Emily Davis',
          assigneeInitials: 'ED',
        },
      ],
    },
    {
      id: 'in-progress',
      title: 'In Progress',
      accent: 'var(--accent-primary)',
      cards: [
        {
          id: '4',
          title: 'Mold remediation - Oak St',
          description: 'Ongoing treatment at 234 Oak Street, basement level.',
          tag: 'Remediation',
          priority: 'high',
          assignee: 'Tom Wilson',
          assigneeInitials: 'TW',
        },
        {
          id: '5',
          title: 'Equipment rental follow-up',
          description: 'Confirm dehumidifier delivery for Friday morning.',
          tag: 'Logistics',
          priority: 'medium',
          assignee: 'Lisa Park',
          assigneeInitials: 'LP',
        },
      ],
    },
    {
      id: 'review',
      title: 'Review',
      accent: 'var(--accent-info)',
      cards: [
        {
          id: '6',
          title: 'Final report - Sunset Blvd',
          description: 'Compile moisture readings and before/after photos.',
          tag: 'Reports',
          priority: 'medium',
          assignee: 'Sarah Johnson',
          assigneeInitials: 'SJ',
        },
      ],
    },
    {
      id: 'done',
      title: 'Done',
      accent: 'var(--accent-success)',
      cards: [
        {
          id: '7',
          title: 'Invoice sent - Riverside',
          description: 'Billing complete for Riverside Mall restoration.',
          tag: 'Billing',
          priority: 'low',
          assignee: 'Mike Chen',
          assigneeInitials: 'MC',
        },
        {
          id: '8',
          title: 'Client feedback survey',
          description: 'Collected 5-star rating from Maple Ave project.',
          tag: 'CSAT',
          priority: 'low',
          assignee: 'Emily Davis',
          assigneeInitials: 'ED',
        },
      ],
    },
  ]);

  prioritySeverity(p: string): 'success' | 'warn' | 'danger' | 'secondary' {
    switch (p) {
      case 'high':
        return 'danger';
      case 'medium':
        return 'warn';
      case 'low':
        return 'success';
      default:
        return 'secondary';
    }
  }

  drop(event: CdkDragDrop<KanbanCard[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    }
  }
}
