import { NextResponse } from 'next/server';
import { 
  createStudentNotification, 
  createManagerNotification,
  notifyAllManagers,
  notifyBuildingManagers,
  createReservationRequestNotification,
  notifyReservationApproved,
  notifyReservationRejected,
  notifyRoomMaintenance,
  notifyHighOccupancy,
  notifyRfidAccess
} from '@/app/utils/notification-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, ...data } = body;

    let result: string | boolean | null = null;

    switch (type) {
      case 'student':
        result = await createStudentNotification(
          data.userId,
          data.title,
          data.message,
          data.notificationType,
          data.action || null
        );
        break;
      case 'manager':
        result = await createManagerNotification(
          data.userId,
          data.title,
          data.message,
          data.notificationType,
          data.priority || 'normal'
        );
        break;
      case 'all_managers':
        result = await notifyAllManagers(
          data.title,
          data.message,
          data.notificationType,
          data.priority || 'normal'
        );
        break;
      case 'building_managers':
        result = await notifyBuildingManagers(
          data.buildingName,
          data.title,
          data.message,
          data.notificationType,
          data.priority || 'normal'
        );
        break;
      case 'reservation_request':
        result = await createReservationRequestNotification(
          data.buildingName,
          data.roomName,
          data.studentName,
          data.reservationDate,
          data.reservationTime,
          data.reservationId
        );
        break;
      case 'reservation_approved':
        result = await notifyReservationApproved(
          data.studentId,
          data.roomName,
          data.buildingName,
          data.reservationDate,
          data.reservationTime,
          data.managerName
        );
        break;
      case 'reservation_rejected':
        result = await notifyReservationRejected(
          data.studentId,
          data.roomName,
          data.buildingName,
          data.reservationDate,
          data.reservationTime,
          data.managerName,
          data.reason
        );
        break;
      case 'room_maintenance':
        result = await notifyRoomMaintenance(
          data.buildingName,
          data.roomName,
          data.startDate,
          data.endDate,
          data.reason
        );
        break;
      case 'high_occupancy':
        result = await notifyHighOccupancy(
          data.buildingName,
          data.occupancyPercentage
        );
        break;
      case 'rfid_access':
        result = await notifyRfidAccess(
          data.studentId,
          data.action,
          data.roomName,
          data.buildingName
        );
        break;
      default:
        return NextResponse.json({ success: false, error: 'Invalid notification type' }, { status: 400 });
    }

    if (result) {
      return NextResponse.json({ success: true, id: result });
    } else {
      return NextResponse.json({ success: false, error: 'Failed to create notification' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
} 