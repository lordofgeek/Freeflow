import { HTTP_BACKEND } from '@/config';
import axios from 'axios';

type Shape =
  | {
      type: 'rect';
      x: number;
      y: number;
      width: number;
      height: number;
    }
  | {
      type: 'circle';
      centerX: number;
      centerY: number;
      radius: number;
    }
  | {
      type: 'pencil';
      startX: number;
      startY: number;
      endX: number;
      endY: number;
    };

export async function initDraw(
  canvas: HTMLCanvasElement,
  roomId: string,
  socket: WebSocket
) {
  const ctx = canvas.getContext('2d');
  let existingShapes: Shape[] = await getExsistingShapes(roomId);
  if (!ctx) {
    return;
  }

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type == 'chat') {
      const parsedShape = JSON.parse(message.message);
      existingShapes.push(parsedShape);
      clearCanvas(existingShapes, ctx, canvas);
    }
  };
  clearCanvas(existingShapes, ctx, canvas);
  let clicked = false;
  let startX = 0;
  let startY = 0;

  canvas.addEventListener('mousedown', (e) => {
    clicked = true;
    startX = e.clientX;
    startY = e.clientY;
  });

  canvas.addEventListener('mouseup', (e) => {
    clicked = false;
    const width = e.clientX - startX;
    const height = e.clientY - startY;
    const shape: Shape = {
      type: 'rect',
      x: startX,
      y: startY,
      width: width,
      height: height,
    };

    existingShapes.push(shape);

    socket.send(
      JSON.stringify({
        type: 'chat',
        message: JSON.stringify({
          shape,
        }),
      })
    );
  });

  canvas.addEventListener('mousemove', (e) => {
    if (clicked) {
      const width = e.clientX - startX;
      const height = e.clientY - startY;
      clearCanvas(existingShapes, ctx, canvas);
      ctx.strokeStyle = 'rgba(255,255,255)';
      ctx.strokeRect(startX, startY, width, height);
    }
  });
}
function clearCanvas(
  existingShapes: Shape[],
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement
) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(0,0,0)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  existingShapes.map((shape) => {
    if (shape.type === 'rect') {
      ctx.strokeStyle = 'rgba(255,255,255)';
      ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
    }
  });
}

async function getExsistingShapes(roomId: string) {
  const res = await axios.get(`${HTTP_BACKEND}/chats/${roomId}`);

  const messages = res.data.messages;
  const shapes = messages.map((x: { message: string }) => {
    const messageData = JSON.parse(x.message);
    return messageData;
  });
  return shapes;
}
