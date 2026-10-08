'use client';

import { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Clock3,
  AlertCircle,
  Plus,
  Search,
  Trash2,
  Edit2,
  FileText,
  UserCheck,
  ListTodo,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import {
  useMeetings,
  useCreateMeeting,
  useUpdateMeeting,
  useDeleteMeeting,
  useMomTasks,
  useCreateMomTask,
  useUpdateMomTask,
  useDeleteMomTask,
  useStaffEmployees,
  type MeetingItem,
  type MomTask,
  type CreateMeetingInput,
} from '@/hooks';
import { formatDate } from '@/lib/utils';

export function GovernanceContent() {
  const { addToast: toast } = useToast();
  const [activeTab, setActiveTab] = useState<'meetings' | 'tasks'>('meetings');
  const [meetingFilter, setMeetingFilter] = useState<string>('all');
  const [taskFilter, setTaskFilter] = useState<string>('all');

  const { data: meetings = [], isLoading: isMeetingsLoading } = useMeetings(meetingFilter);
  const { data: tasks = [], isLoading: isTasksLoading } = useMomTasks(
    undefined,
    undefined,
    taskFilter,
  );
  const { data: staffData } = useStaffEmployees();
  const staffList = staffData?.data ?? [];

  const createMeetingMutation = useCreateMeeting();
  const updateMeetingMutation = useUpdateMeeting();
  const deleteMeetingMutation = useDeleteMeeting();

  const createMomTaskMutation = useCreateMomTask();
  const updateMomTaskMutation = useUpdateMomTask();
  const deleteMomTaskMutation = useDeleteMomTask();

  // Dialog states
  const [isCreateMeetingOpen, setIsCreateMeetingOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<MeetingItem | null>(null);
  const [minutesMeeting, setMinutesMeeting] = useState<MeetingItem | null>(null);
  const [minutesText, setMinutesText] = useState('');

  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [taskTargetMeeting, setTaskTargetMeeting] = useState<MeetingItem | null>(null);

  // Forms
  const [meetingForm, setMeetingForm] = useState<CreateMeetingInput>({
    title: '',
    meeting_date: new Date().toISOString().split('T')[0],
    start_time: '19:00',
    end_time: '20:30',
    location: 'Clubhouse Committee Boardroom',
    agenda: '',
    minutes: '',
    status: 'scheduled',
  });

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assignee_id: '',
    due_date: new Date().toISOString().split('T')[0],
    status: 'pending' as 'pending' | 'in_progress' | 'completed',
  });

  const handleOpenCreateMeeting = () => {
    setEditingMeeting(null);
    setMeetingForm({
      title: '',
      meeting_date: new Date().toISOString().split('T')[0],
      start_time: '19:00',
      end_time: '20:30',
      location: 'Clubhouse Committee Boardroom',
      agenda: '',
      minutes: '',
      status: 'scheduled',
    });
    setIsCreateMeetingOpen(true);
  };

  const handleOpenEditMeeting = (m: MeetingItem) => {
    setEditingMeeting(m);
    setMeetingForm({
      title: m.title,
      meeting_date: m.meeting_date,
      start_time: m.start_time,
      end_time: m.end_time,
      location: m.location ?? '',
      agenda: m.agenda ?? '',
      minutes: m.minutes ?? '',
      status: m.status,
    });
    setIsCreateMeetingOpen(true);
  };

  const handleSaveMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingForm.title.trim() || !meetingForm.meeting_date) {
      toast({
        title: 'Validation Error',
        description: 'Please provide a title and date for the committee meeting.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingMeeting) {
        await updateMeetingMutation.mutateAsync({
          id: editingMeeting.id,
          data: meetingForm,
        });
        toast({ title: 'Meeting Updated', description: 'Changes saved successfully.' });
      } else {
        await createMeetingMutation.mutateAsync(meetingForm);
        toast({ title: 'Meeting Scheduled', description: 'New committee meeting created.' });
      }
      setIsCreateMeetingOpen(false);
    } catch {
      toast({
        title: 'Operation Failed',
        description: 'Could not save meeting details.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteMeeting = async (id: string) => {
    if (!confirm('Are you sure you want to delete this meeting and its associated tasks?')) return;
    try {
      await deleteMeetingMutation.mutateAsync(id);
      toast({ title: 'Meeting Deleted', description: 'Removed meeting record.' });
    } catch {
      toast({
        title: 'Failed to delete',
        description: 'Could not delete meeting.',
        variant: 'destructive',
      });
    }
  };

  const handleOpenMinutes = (m: MeetingItem) => {
    setMinutesMeeting(m);
    setMinutesText(m.minutes ?? '');
  };

  const handleSaveMinutes = async () => {
    if (!minutesMeeting) return;
    try {
      await updateMeetingMutation.mutateAsync({
        id: minutesMeeting.id,
        data: {
          minutes: minutesText,
          status: 'completed',
        },
      });
      toast({ title: 'Minutes Recorded', description: 'MoM saved and meeting marked completed.' });
      setMinutesMeeting(null);
    } catch {
      toast({
        title: 'Save Failed',
        description: 'Could not update meeting minutes.',
        variant: 'destructive',
      });
    }
  };

  const handleOpenCreateTask = (m: MeetingItem) => {
    setTaskTargetMeeting(m);
    setTaskForm({
      title: '',
      description: '',
      assignee_id: staffList[0]?.id ?? '',
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: 'pending',
    });
    setIsCreateTaskOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTargetMeeting || !taskForm.title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please provide task title.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createMomTaskMutation.mutateAsync({
        meetingId: taskTargetMeeting.id,
        data: {
          title: taskForm.title,
          description: taskForm.description || null,
          assignee_id: taskForm.assignee_id || null,
          due_date: taskForm.due_date || null,
          status: taskForm.status,
        },
      });
      toast({ title: 'Task Dispatched', description: 'MoM action item assigned to staff.' });
      setIsCreateTaskOpen(false);
    } catch {
      toast({
        title: 'Dispatch Failed',
        description: 'Could not create MoM task.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleTaskStatus = async (task: MomTask) => {
    const nextStatus =
      task.status === 'pending'
        ? 'in_progress'
        : task.status === 'in_progress'
        ? 'completed'
        : 'pending';
    try {
      await updateMomTaskMutation.mutateAsync({
        taskId: task.id,
        data: { status: nextStatus },
      });
      toast({
        title: 'Task Status Updated',
        description: `Status changed to ${nextStatus.replace('_', ' ')}.`,
      });
    } catch {
      toast({
        title: 'Update Failed',
        description: 'Could not change task status.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to remove this MoM task?')) return;
    try {
      await deleteMomTaskMutation.mutateAsync(taskId);
      toast({ title: 'Task Deleted', description: 'Action item removed.' });
    } catch {
      toast({
        title: 'Failed to delete',
        description: 'Could not remove task.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Society Governance & Meetings</h1>
          <p className="text-sm text-muted-foreground">
            Schedule Managing Committee meetings, record official Minutes (MoM), and track staff action items.
          </p>
        </div>
        <Button onClick={handleOpenCreateMeeting} className="gap-2">
          <Plus className="h-4 w-4" />
          Schedule Meeting
        </Button>
      </div>

      {/* Main Tabs */}
      <div className="flex items-center gap-2 border-b pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('meetings')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'meetings'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Calendar className="h-4 w-4" />
          Committee Meetings ({meetings.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'tasks'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <ListTodo className="h-4 w-4" />
          MoM Action Tasks ({tasks.length})
        </button>
      </div>

      {/* Tab 1: Meetings */}
      {activeTab === 'meetings' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['all', 'scheduled', 'completed', 'cancelled'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setMeetingFilter(filter)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  meetingFilter === filter
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {isMeetingsLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[1, 2].map((i) => (
                <Card key={i} className="animate-pulse h-48" />
              ))}
            </div>
          ) : meetings.length === 0 ? (
            <Card className="flex flex-col items-center justify-center p-12 text-center">
              <Calendar className="h-10 w-10 text-muted-foreground/60 mb-2" />
              <CardTitle className="text-base">No meetings scheduled</CardTitle>
              <CardDescription className="max-w-sm mt-1">
                There are no committee meetings recorded in this status. Click "Schedule Meeting" to create one.
              </CardDescription>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {meetings.map((m) => (
                <Card key={m.id} className="flex flex-col border">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge
                        variant={
                          m.status === 'completed'
                            ? 'default'
                            : m.status === 'scheduled'
                            ? 'secondary'
                            : 'destructive'
                        }
                        className="capitalize"
                      >
                        {m.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Tasks: {m.completed_tasks ?? 0} / {m.total_tasks ?? 0} Done
                      </span>
                    </div>
                    <CardTitle className="text-lg mt-2">{m.title}</CardTitle>
                    {m.location && (
                      <CardDescription className="flex items-center gap-1.5 text-xs">
                        <MapPin className="h-3 w-3 text-primary" />
                        {m.location}
                      </CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="flex-1 space-y-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        <span>{formatDate(m.meeting_date)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        <span>
                          {m.start_time} - {m.end_time}
                        </span>
                      </div>
                    </div>

                    {m.agenda && (
                      <div className="rounded-md bg-muted/40 p-2 text-foreground/90">
                        <p className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5">
                          Agenda
                        </p>
                        <p className="line-clamp-2">{m.agenda}</p>
                      </div>
                    )}

                    {m.minutes && (
                      <div className="rounded-md bg-primary/5 p-2 border border-primary/10">
                        <p className="font-semibold text-[11px] uppercase tracking-wider text-primary mb-0.5">
                          Recorded MoM
                        </p>
                        <p className="line-clamp-2 text-foreground/80">{m.minutes}</p>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-4 py-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenMinutes(m)}
                        className="gap-1 h-7 text-xs"
                      >
                        <FileText className="h-3 w-3" />
                        {m.minutes ? 'Edit Minutes' : 'Record MoM'}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenCreateTask(m)}
                        className="gap-1 h-7 text-xs"
                      >
                        <Plus className="h-3 w-3" />
                        Assign Task
                      </Button>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleOpenEditMeeting(m)}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteMeeting(m.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: MoM Action Tasks */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['all', 'pending', 'in_progress', 'completed'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setTaskFilter(filter)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  taskFilter === filter
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {filter.replace('_', ' ')}
              </button>
            ))}
          </div>

          {isTasksLoading ? (
            <Card className="animate-pulse h-48" />
          ) : tasks.length === 0 ? (
            <Card className="flex flex-col items-center justify-center p-12 text-center">
              <CheckCircle2 className="h-10 w-10 text-muted-foreground/60 mb-2" />
              <CardTitle className="text-base">No action items found</CardTitle>
              <CardDescription className="max-w-sm mt-1">
                There are no actionable tasks logged in this status. Add tasks from the Meetings tab.
              </CardDescription>
            </Card>
          ) : (
            <div className="rounded-lg border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b bg-muted/40 font-medium text-muted-foreground">
                    <tr>
                      <th className="p-3">Status</th>
                      <th className="p-3">Task Details</th>
                      <th className="p-3">Origin Meeting</th>
                      <th className="p-3">Assignee</th>
                      <th className="p-3">Due Date</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {tasks.map((task) => (
                      <tr key={task.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => handleToggleTaskStatus(task)}
                            className="flex items-center gap-1.5 focus:outline-none"
                            title="Click to advance status"
                          >
                            {task.status === 'completed' ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            ) : task.status === 'in_progress' ? (
                              <Clock3 className="h-4 w-4 text-amber-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-muted-foreground" />
                            )}
                            <Badge
                              variant={
                                task.status === 'completed'
                                  ? 'default'
                                  : task.status === 'in_progress'
                                  ? 'secondary'
                                  : 'outline'
                              }
                              className="capitalize text-[10px]"
                            >
                              {task.status.replace('_', ' ')}
                            </Badge>
                          </button>
                        </td>
                        <td className="p-3">
                          <p className="font-semibold text-foreground text-sm">{task.title}</p>
                          {task.description && (
                            <p className="text-muted-foreground line-clamp-1">{task.description}</p>
                          )}
                        </td>
                        <td className="p-3 font-medium text-muted-foreground">
                          {task.meeting_title ?? 'General MoM'}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="h-3.5 w-3.5 text-primary" />
                            <span>{task.assignee_name ?? 'Unassigned'}</span>
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {task.due_date ? formatDate(task.due_date) : 'No due date'}
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Schedule / Edit Meeting Dialog */}
      <Dialog open={isCreateMeetingOpen} onOpenChange={setIsCreateMeetingOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSaveMeeting}>
            <DialogHeader>
              <DialogTitle>{editingMeeting ? 'Edit Committee Meeting' : 'Schedule Meeting'}</DialogTitle>
              <DialogDescription>
                Set date, time, location, and proposed agenda for the managing committee.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 text-sm">
              <div className="space-y-1.5">
                <Label htmlFor="m-title">Meeting Title *</Label>
                <Input
                  id="m-title"
                  placeholder="e.g. Monthly Managing Committee Meeting (Oct 2026)"
                  value={meetingForm.title}
                  onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="m-date">Meeting Date *</Label>
                  <Input
                    id="m-date"
                    type="date"
                    value={meetingForm.meeting_date}
                    onChange={(e) => setMeetingForm({ ...meetingForm, meeting_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-location">Location / Venue</Label>
                  <Input
                    id="m-location"
                    placeholder="Clubhouse Boardroom"
                    value={meetingForm.location ?? ''}
                    onChange={(e) => setMeetingForm({ ...meetingForm, location: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="m-start">Start Time *</Label>
                  <Input
                    id="m-start"
                    type="time"
                    value={meetingForm.start_time}
                    onChange={(e) => setMeetingForm({ ...meetingForm, start_time: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-end">End Time *</Label>
                  <Input
                    id="m-end"
                    type="time"
                    value={meetingForm.end_time}
                    onChange={(e) => setMeetingForm({ ...meetingForm, end_time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="m-status">Meeting Status</Label>
                <select
                  id="m-status"
                  value={meetingForm.status}
                  onChange={(e) =>
                    setMeetingForm({
                      ...meetingForm,
                      status: e.target.value as CreateMeetingInput['status'],
                    })
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="m-agenda">Proposed Agenda Items</Label>
                <Textarea
                  id="m-agenda"
                  rows={3}
                  placeholder="1. Review of annual maintenance contracts&#10;2. Lift modernizations approval&#10;3. Festival preparations"
                  value={meetingForm.agenda ?? ''}
                  onChange={(e) => setMeetingForm({ ...meetingForm, agenda: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateMeetingOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMeetingMutation.isPending || updateMeetingMutation.isPending}
              >
                {editingMeeting ? 'Save Changes' : 'Schedule Meeting'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Minutes (MoM) Dialog */}
      <Dialog open={!!minutesMeeting} onOpenChange={(open) => !open && setMinutesMeeting(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Minutes of Meeting (MoM)</DialogTitle>
            <DialogDescription>
              {minutesMeeting?.title} &bull; {minutesMeeting && formatDate(minutesMeeting.meeting_date)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm">
            <Label htmlFor="minutes-input">Official Decisions & Minutes</Label>
            <Textarea
              id="minutes-input"
              rows={8}
              placeholder="Record the decisions made, attendance quorum, resolutions passed, and major discussion points..."
              value={minutesText}
              onChange={(e) => setMinutesText(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMinutesMeeting(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveMinutes}
              disabled={updateMeetingMutation.isPending}
            >
              Save Minutes & Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign MoM Action Task Dialog */}
      <Dialog open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveTask}>
            <DialogHeader>
              <DialogTitle>Assign Action Item (MoM)</DialogTitle>
              <DialogDescription>
                Assign actionable task from: {taskTargetMeeting?.title}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-4 text-sm">
              <div className="space-y-1.5">
                <Label htmlFor="t-title">Task Title *</Label>
                <Input
                  id="t-title"
                  placeholder="e.g. Inspect fire hydrant valves on Block B"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="t-assignee">Assigned Staff Member *</Label>
                <select
                  id="t-assignee"
                  value={taskForm.assignee_id}
                  onChange={(e) => setTaskForm({ ...taskForm, assignee_id: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                  required
                >
                  <option value="">-- Select Staff Assignee --</option>
                  {staffList.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name} ({staff.designation ?? staff.staff_type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="t-due">Target Completion Date</Label>
                <Input
                  id="t-due"
                  type="date"
                  value={taskForm.due_date}
                  onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="t-desc">Instructions & Context</Label>
                <Textarea
                  id="t-desc"
                  rows={3}
                  placeholder="Provide scope, vendor contacts, or specific action required..."
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateTaskOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMomTaskMutation.isPending}>
                Dispatch Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
