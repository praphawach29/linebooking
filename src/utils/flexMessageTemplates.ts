import { Booking, Tenant } from '../types';

export const generateBookingConfirmationFlexMessage = (booking: Booking, tenant: Tenant, liffId?: string) => {
  const isConfirmed = booking.status === 'confirmed';
  const headerColor = isConfirmed ? '#10B981' : '#F59E0B'; // Green for confirmed, Orange for pending
  const titleText = isConfirmed ? 'ยืนยันการจองคิวสำเร็จ' : 'รอการตรวจสอบการชำระเงิน';
  
  const formattedDate = new Date(booking.bookingDate).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  // Use LIFF ID if provided, otherwise fallback to a standard URL or just '#'. 
  // Normally the LIFF URL format is line://app/<liffId> or https://liff.line.me/<liffId>
  const detailUri = liffId ? `https://liff.line.me/${liffId}?path=/bookings/${booking.id}` : 'https://line.me/R/';

  return {
    type: 'flex',
    altText: `แจ้งเตือนการจองคิว: ${booking.refNo}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: titleText,
                color: '#ffffff',
                size: 'lg',
                flex: 4,
                weight: 'bold'
              }
            ]
          }
        ],
        paddingAll: '20px',
        backgroundColor: headerColor,
        spacing: 'md',
        paddingTop: '22px'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: tenant.name,
            weight: 'bold',
            size: 'xl',
            margin: 'md'
          },
          {
            type: 'text',
            text: `หมายเลขการจอง: ${booking.refNo}`,
            size: 'xs',
            color: '#aaaaaa',
            wrap: true
          },
          {
            type: 'separator',
            margin: 'xxl'
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'xxl',
            spacing: 'sm',
            contents: [
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: 'บริการ',
                    size: 'sm',
                    color: '#555555',
                    flex: 0,
                    weight: 'bold'
                  },
                  {
                    type: 'text',
                    text: booking.serviceName,
                    size: 'sm',
                    color: '#111111',
                    align: 'end',
                    weight: 'bold',
                    wrap: true
                  }
                ]
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: 'วันที่',
                    size: 'sm',
                    color: '#555555',
                    flex: 0,
                    weight: 'bold'
                  },
                  {
                    type: 'text',
                    text: formattedDate,
                    size: 'sm',
                    color: '#111111',
                    align: 'end',
                    weight: 'bold'
                  }
                ]
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: 'เวลา',
                    size: 'sm',
                    color: '#555555',
                    flex: 0,
                    weight: 'bold'
                  },
                  {
                    type: 'text',
                    text: `${booking.startTime} - ${booking.endTime}`,
                    size: 'sm',
                    color: '#111111',
                    align: 'end',
                    weight: 'bold'
                  }
                ]
              }
            ]
          },
          {
            type: 'separator',
            margin: 'xxl'
          },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'md',
            contents: [
              {
                type: 'text',
                text: 'ยอดสุทธิ',
                size: 'sm',
                color: '#555555',
                weight: 'bold'
              },
              {
                type: 'text',
                text: `฿${booking.price.toLocaleString()}`,
                size: 'md',
                color: '#111111',
                align: 'end',
                weight: 'bold'
              }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: 'สถานะชำระเงิน',
                size: 'sm',
                color: '#555555',
                weight: 'bold'
              },
              {
                type: 'text',
                text: booking.paymentStatus === 'paid' ? 'ชำระแล้ว' : 'ยังไม่ชำระ',
                size: 'sm',
                color: booking.paymentStatus === 'paid' ? '#10B981' : '#EF4444',
                align: 'end',
                weight: 'bold'
              }
            ]
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            color: '#10B981',
            action: {
              type: 'uri',
              label: 'ดูรายละเอียดการจอง',
              uri: detailUri
            }
          }
        ],
        flex: 0
      }
    }
  };
};
