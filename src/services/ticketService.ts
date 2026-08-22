import { supabase } from '../lib/supabase';
import { ITTicket, Priority, Status, ActionEntry } from '../types';

/**
 * Utility to clean undefined values before sending to Supabase
 */
const cleanData = (obj: Record<string, any>) => {
  const cleaned: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  }
  return cleaned;
};

/**
 * Maps a raw Supabase database row to the strongly-typed ITTicket domain model.
 * Handles both camelCase and snake_case column names seamlessly.
 */
export const mapDbRecordToTicket = (row: any): ITTicket => {
  let parsedActions: ActionEntry[] = [];
  if (Array.isArray(row.actions)) {
    parsedActions = row.actions;
  } else if (typeof row.actions === 'string') {
    try {
      parsedActions = JSON.parse(row.actions);
    } catch {
      parsedActions = [];
    }
  }

  return {
    id: String(row.id || ''),
    problemType: row.problemType || row.problem_type || row.title || row.type || 'General Support',
    priority: (row.priority as Priority) || Priority.MEDIUM,
    requestTime: row.requestTime || row.request_time || row.created_at || new Date().toISOString(),
    requesterName: row.requesterName || row.requester_name || 'Anonymous',
    requesterBranch: row.requesterBranch || row.requester_branch || row.branch || undefined,
    department: row.department || undefined,
    assignedTo: row.assignedTo || row.assigned_to || row.assignee || undefined,
    assignedToName: row.assignedToName || row.assigned_to_name || undefined,
    responseTime: row.responseTime !== undefined ? Number(row.responseTime) : (row.response_time !== undefined ? Number(row.response_time) : undefined),
    actions: parsedActions,
    status: (row.status as Status) || Status.PENDING,
    completedAt: row.completedAt || row.completed_at || row.resolved_at || undefined,
    description: row.description || undefined
  };
};

/**
 * Maps domain ITTicket fields into a format ready for Supabase table upsert/insert.
 */
export const mapTicketToDbRecord = (ticket: Partial<ITTicket>) => {
  const record: Record<string, any> = {
    updated_at: new Date().toISOString()
  };

  if (ticket.id) record.id = ticket.id;
  if (ticket.problemType !== undefined) {
    record.problemType = ticket.problemType;
    record.problem_type = ticket.problemType;
    record.title = ticket.problemType;
  }
  if (ticket.priority !== undefined) {
    record.priority = ticket.priority;
  }
  if (ticket.requestTime !== undefined) {
    record.requestTime = ticket.requestTime;
    record.request_time = ticket.requestTime;
    record.created_at = ticket.requestTime;
  }
  if (ticket.requesterName !== undefined) {
    record.requesterName = ticket.requesterName;
    record.requester_name = ticket.requesterName;
  }
  if (ticket.requesterBranch !== undefined) {
    record.requesterBranch = ticket.requesterBranch;
    record.requester_branch = ticket.requesterBranch;
    record.branch = ticket.requesterBranch;
  }
  if (ticket.department !== undefined) {
    record.department = ticket.department;
  }
  if (ticket.assignedTo !== undefined) {
    record.assignedTo = ticket.assignedTo;
    record.assigned_to = ticket.assignedTo;
    record.assignee = ticket.assignedTo;
  }
  if (ticket.assignedToName !== undefined) {
    record.assignedToName = ticket.assignedToName;
    record.assigned_to_name = ticket.assignedToName;
  }
  if (ticket.responseTime !== undefined) {
    record.responseTime = ticket.responseTime;
    record.response_time = ticket.responseTime;
  }
  if (ticket.actions !== undefined) {
    record.actions = ticket.actions;
  }
  if (ticket.status !== undefined) {
    record.status = ticket.status;
  }
  if (ticket.completedAt !== undefined) {
    record.completedAt = ticket.completedAt;
    record.completed_at = ticket.completedAt;
    record.resolved_at = ticket.completedAt;
  }
  if (ticket.description !== undefined) {
    record.description = ticket.description;
  }

  return cleanData(record);
};

/**
 * Fetch all IT tickets from Supabase.
 */
export const fetchTickets = async (): Promise<ITTicket[]> => {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn("Retrying fetchTickets without created_at order:", error.message);
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('tickets')
        .select('*');

      if (fallbackError) {
        console.error("Error fetching tickets from Supabase:", fallbackError);
        return [];
      }
      return (fallbackData || []).map(mapDbRecordToTicket);
    }

    return (data || []).map(mapDbRecordToTicket);
  } catch (error) {
    console.error("Unexpected error fetching tickets:", error);
    return [];
  }
};

/**
 * Fetch a single ticket by its ID.
 */
export const getTicketById = async (ticketId: string): Promise<ITTicket | null> => {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (error || !data) {
      return null;
    }

    return mapDbRecordToTicket(data);
  } catch (error) {
    console.error("Error fetching ticket by ID:", error);
    return null;
  }
};

/**
 * Create a new IT ticket in Supabase.
 */
export const createTicket = async (ticketData: Partial<ITTicket>): Promise<string | null> => {
  try {
    const ticketId = ticketData.id || crypto.randomUUID();
    const payload = {
      ...mapTicketToDbRecord({
        ...ticketData,
        id: ticketId,
        requestTime: ticketData.requestTime || new Date().toISOString(),
        status: ticketData.status || Status.PENDING,
        priority: ticketData.priority || Priority.MEDIUM,
        actions: ticketData.actions || []
      })
    };

    const { data, error } = await supabase
      .from('tickets')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      console.error("Error creating ticket in Supabase:", error);
      // Try upsert fallback
      await supabase.from('tickets').upsert(payload);
      return ticketId;
    }

    return data?.id || ticketId;
  } catch (error) {
    console.error("Unexpected error creating ticket:", error);
    return null;
  }
};

/**
 * Update an existing IT ticket in Supabase.
 */
export const updateTicket = async (ticketId: string, updates: Partial<ITTicket>): Promise<boolean> => {
  try {
    const payload = mapTicketToDbRecord({ ...updates, id: ticketId });
    const { error } = await supabase
      .from('tickets')
      .update(payload)
      .eq('id', ticketId);

    if (error) {
      console.error("Error updating ticket in Supabase:", error);
      // Fallback: try upsert
      await supabase.from('tickets').upsert(payload);
    }
    return true;
  } catch (error) {
    console.error("Unexpected error updating ticket:", error);
    return false;
  }
};

/**
 * Save or Upsert an IT ticket in Supabase (convenience method preserving backward compatibility).
 */
export const saveTicket = async (ticket: Partial<ITTicket>): Promise<string | undefined> => {
  try {
    const ticketId = ticket.id || crypto.randomUUID();
    const payload = mapTicketToDbRecord({
      ...ticket,
      id: ticketId
    });

    const { error } = await supabase
      .from('tickets')
      .upsert(payload);

    if (error) {
      console.error("Error saving ticket in Supabase:", error);
      throw error;
    }

    return ticketId;
  } catch (error) {
    console.error("Unexpected error in saveTicket:", error);
    return undefined;
  }
};

/**
 * Delete an IT ticket by ID from Supabase.
 */
export const deleteTicket = async (ticketId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', ticketId);

    if (error) {
      console.error("Error deleting ticket in Supabase:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Unexpected error deleting ticket:", error);
    return false;
  }
};

/**
 * Query tickets filtered by status.
 */
export const fetchTicketsByStatus = async (status: Status): Promise<ITTicket[]> => {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching tickets by status:", error);
      return [];
    }

    return (data || []).map(mapDbRecordToTicket);
  } catch (error) {
    console.error("Unexpected error in fetchTicketsByStatus:", error);
    return [];
  }
};

/**
 * Query tickets assigned to a specific user.
 */
export const fetchTicketsByAssignee = async (userId: string): Promise<ITTicket[]> => {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('assigned_to', userId);

    if (error) {
      console.error("Error fetching tickets by assignee:", error);
      return [];
    }

    return (data || []).map(mapDbRecordToTicket);
  } catch (error) {
    console.error("Unexpected error in fetchTicketsByAssignee:", error);
    return [];
  }
};

/**
 * Subscribe to realtime changes on the Supabase 'tickets' table.
 */
export const subscribeToTickets = (onTicketsChange: (tickets: ITTicket[]) => void): (() => void) => {
  // 1. Initial fetch
  fetchTickets().then((initialTickets) => {
    if (initialTickets.length > 0) {
      onTicketsChange(initialTickets);
    }
  });

  // 2. Realtime listener
  const channel = supabase
    .channel('tickets-realtime-channel')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tickets'
      },
      async () => {
        // On any change (insert, update, delete), re-fetch latest tickets list
        const updated = await fetchTickets();
        onTicketsChange(updated);
      }
    )
    .subscribe();

  // Return cleanup unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
};
