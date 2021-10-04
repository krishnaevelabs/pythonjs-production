import asyncio
import datetime
import random
import websockets
import serial
import io
import serial.tools.list_ports
global ser


def ports():
    global ser
    try:
        ports = list(serial.tools.list_ports.comports())
        if ports:
            for p in ports:
#                     print(p.vid,p.pid)                    
                if p.vid == 4292 and p.pid == 60000 or p.vid == 1240 and p.pid==61336:
                    global vid, pid, device
                    vid = p.vid
                    pid = p.pid
                    device = p.device
                    ser = serial.Serial(device,9600, timeout=0.1)
#                         print(vid ,device,pid)
                    return True
                else:
                    return False
                    print("")
        else:
                print("no active comports found")               
    except Exception as e:
        print(e)
            
            
while ports() == False:
    pass


        
        
async def serialRead():
    global ser
    try:
        ##print("hh")
        serValue = ser.readline().decode('utf-8')
        if serValue:
            return(serValue)
        else:
            return False
    except Exception as e :
        while ports() == False:
            pass
        print(e)
        
async def time(websocket, path):
    while True:
        listener_task = asyncio.ensure_future(websocket.recv())
        producer_task = asyncio.ensure_future(serialRead())
        done, pending = await asyncio.wait(
            [listener_task, producer_task],
            return_when=asyncio.FIRST_COMPLETED)
        
        if producer_task in done:
            x=producer_task.result()
            if x:
                print(x)
                await websocket.send(x)
                ##await asyncio.sleep(random.random() * 3)
        else:
            producer_task.cancel()

        if listener_task in done:
            message = listener_task.result()
#             await consumer(message)
            ## do some task on receive do serial write.
            print(message)
            ser.write(message.encode("ascii"))
        else:
            listener_task.cancel()

        

start_server = websockets.serve(time, '0.0.0.0', 5678)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()

