// Client-side utility functions for sending notifications
//Send a notification to a student
export const sendStudentNotification = async (
  userId: string,
  title: string,
  message: string,
  notificationType: 'success' | 'warning' | 'info',
  action: string | null = null
): Promise<boolean> => {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'student',
        userId,
        title,
        message,
        notificationType,
        action
      }),
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error sending student notification:', error);
    return false;
  }
};

/**
 * Send a notification to a manager
 */
export const sendManagerNotification = async (
  userId: string,
  title: string,
  message: string,
  notificationType: 'approval' | 'occupancy' | 'system' | 'announcement',
  priority: 'high' | 'normal' | 'low' = 'normal'
): Promise<boolean> => {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'manager',
        userId,
        title,
        message,
        notificationType,
        priority
      }),
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error sending manager notification:', error);
    return false;
  }
};

/**
 * Send a notification to all managers
 */
export const sendNotificationToAllManagers = async (
  title: string,
  message: string,
  notificationType: 'approval' | 'occupancy' | 'system' | 'announcement',
  priority: 'high' | 'normal' | 'low' = 'normal'
): Promise<boolean> => {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'all_managers',
        title,
        message,
        notificationType,
        priority
      }),
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error sending notification to all managers:', error);
    return false;
  }
};

/**
 * Send a notification to managers of a specific building
 */
export const sendNotificationToBuildingManagers = async (
  buildingName: string,
  title: string,
  message: string,
  notificationType: 'approval' | 'occupancy' | 'system' | 'announcement',
  priority: 'high' | 'normal' | 'low' = 'normal'
): Promise<boolean> => {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'building_managers',
        buildingName,
        title,
        message,
        notificationType,
        priority
      }),
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error sending notification to building managers:', error);
    return false;
  }
};

/**
 * Send a reservation request notification to managers
 */
export const sendReservationRequestNotification = async (
  buildingName: string,
  roomName: string,
  studentName: string,
  reservationDate: string,
  reservationTime: string,
  reservationId: string
): Promise<boolean> => {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'reservation_request',
        buildingName,
        roomName,
        studentName,
        reservationDate,
        reservationTime,
        reservationId
      }),
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error sending reservation request notification:', error);
    return false;
  }
};

/**
 * Send a reservation approval notification to a student
 */
export const sendReservationApprovedNotification = async (
  studentId: string,
  roomName: string,
  buildingName: string,
  reservationDate: string,
  reservationTime: string,
  managerName: string
): Promise<boolean> => {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'reservation_approved',
        studentId,
        roomName,
        buildingName,
        reservationDate,
        reservationTime,
        managerName
      }),
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error sending reservation approved notification:', error);
    return false;
  }
};

/**
 * Send a reservation rejection notification to a student
 */
export const sendReservationRejectedNotification = async (
  studentId: string,
  roomName: string,
  buildingName: string,
  reservationDate: string,
  reservationTime: string,
  managerName: string,
  reason: string
): Promise<boolean> => {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'reservation_rejected',
        studentId,
        roomName,
        buildingName,
        reservationDate,
        reservationTime,
        managerName,
        reason
      }),
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error sending reservation rejected notification:', error);
    return false;
  }
};

/**
 * Send a room maintenance notification to managers
 */
export const sendRoomMaintenanceNotification = async (
  buildingName: string,
  roomName: string,
  startDate: string,
  endDate: string,
  reason: string
): Promise<boolean> => {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'room_maintenance',
        buildingName,
        roomName,
        startDate,
        endDate,
        reason
      }),
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error sending room maintenance notification:', error);
    return false;
  }
};

/**
 * Send a high occupancy notification to managers
 */
export const sendHighOccupancyNotification = async (
  buildingName: string,
  occupancyPercentage: number
): Promise<boolean> => {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'high_occupancy',
        buildingName,
        occupancyPercentage
      }),
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error sending high occupancy notification:', error);
    return false;
  }
}; 