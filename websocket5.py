
import asyncio
import datetime
import random
import websockets
import serial
import io
import serial.tools.list_ports
import re
global ser
# import pyttsx3

# engine = pyttsx3.init()
# engine.setProperty('rate', 125)
# voices = engine.getProperty('voices')
# engine.setProperty('voice',"!v/f5")

phoneNumRegex = re.compile(r'(\d{7}-V\d-[C,D,A]-[A-Z|a-z|0-9|-]{9})|(\d{6}-V\d-[A-Z|a-z|0-9|-]{25})')

def ports():
    global ser
    try:
        ports = list(serial.tools.list_ports.comports())
        if ports:
            for p in ports:
                print(p.vid,p.pid)                   
                if p.vid == 4292 and p.pid == 60000 or p.vid == 1240 and p.pid==61336 or p.vid == 6790 and p.pid==21972:
                    global vid, pid, device
                    vid = p.vid
                    pid = p.pid
                    device = p.device
                    ser = serial.Serial(device,115200, timeout=0.1)
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
            # print(serValue)
            if  re.findall("\A<", serValue) and phoneNumRegex.search(serValue) and re.findall("\d\Z", serValue) :
                # print(serValue)
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
            if message.split("*")[1] == " none ":
                speaktext = message.split("*")[1]
                message = message.split("*")[2]
                message = message + "\n"
                print(speaktext)
                # print(message)
            else :
                speaktext = message.split("*")[1]
                message = message.split("*")[2]
                print(speaktext)
                # print(message)
                # engine.say("Call from, "+speaktext)
                # engine.runAndWait()
                
            if ser.write(message.encode("ascii")) :
                print(message)
        else:
            listener_task.cancel()

        

start_server = websockets.serve(time, '0.0.0.0', 5678)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
