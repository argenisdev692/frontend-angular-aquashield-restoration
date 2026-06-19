import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ActivityItem {
  id: string;
  user: string;
  initials: string;
  action: string;
  target: string;
  time: string;
  icon: string;
  iconColor: string;
}

@Component({
  selector: 'app-recent-activity',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recent-activity.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './recent-activity.component.css',
})
export class RecentActivityComponent {
  readonly activities = signal<ActivityItem[]>([
    {
      id: '1',
      user: 'Sarah Johnson',
      initials: 'SJ',
      action: 'created claim',
      target: '#4452',
      time: '2 min ago',
      icon: 'pi-file-plus',
      iconColor: 'var(--accent-primary)',
    },
    {
      id: '2',
      user: 'Mike Chen',
      initials: 'MC',
      action: 'updated status',
      target: 'Oak St Remediation',
      time: '12 min ago',
      icon: 'pi-refresh',
      iconColor: 'var(--accent-info)',
    },
    {
      id: '3',
      user: 'Emily Davis',
      initials: 'ED',
      action: 'approved invoice',
      target: '#4451',
      time: '35 min ago',
      icon: 'pi-check-circle',
      iconColor: 'var(--accent-success)',
    },
    {
      id: '4',
      user: 'Tom Wilson',
      initials: 'TW',
      action: 'scheduled inspection',
      target: 'Sunset Blvd',
      time: '1 hr ago',
      icon: 'pi-calendar',
      iconColor: 'var(--accent-warning)',
    },
    {
      id: '5',
      user: 'Lisa Park',
      initials: 'LP',
      action: 'commented on',
      target: 'Claim #4401',
      time: '2 hr ago',
      icon: 'pi-comment',
      iconColor: 'var(--accent-primary)',
    },
    {
      id: '6',
      user: 'Sarah Johnson',
      initials: 'SJ',
      action: 'assigned task',
      target: 'Review Photos',
      time: '3 hr ago',
      icon: 'pi-user-plus',
      iconColor: 'var(--accent-info)',
    },
    {
      id: '7',
      user: 'Mike Chen',
      initials: 'MC',
      action: 'closed claim',
      target: '#4398',
      time: '5 hr ago',
      icon: 'pi-lock',
      iconColor: 'var(--accent-success)',
    },
    {
      id: '8',
      user: 'Emily Davis',
      initials: 'ED',
      action: 'uploaded document',
      target: 'Policy-2026.pdf',
      time: '6 hr ago',
      icon: 'pi-upload',
      iconColor: 'var(--accent-warning)',
    },
    {
      id: '9',
      user: 'Tom Wilson',
      initials: 'TW',
      action: 'sent message',
      target: 'Client: ABC Corp',
      time: '8 hr ago',
      icon: 'pi-send',
      iconColor: 'var(--accent-primary)',
    },
    {
      id: '10',
      user: 'Lisa Park',
      initials: 'LP',
      action: 'created estimate',
      target: '#1024',
      time: '10 hr ago',
      icon: 'pi-calculator',
      iconColor: 'var(--accent-info)',
    },
  ]);
}
