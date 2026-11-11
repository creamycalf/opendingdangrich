from verify_original_economy import pe
import struct,sys
value=int(sys.argv[1],0);pattern=struct.pack('<I',value)
for s in pe.sections:
 if not s.Characteristics&0x20000000:continue
 data=s.get_data();offset=0
 while True:
  offset=data.find(pattern,offset)
  if offset<0:break
  print(hex(0x400000+s.VirtualAddress+offset),data[max(0,offset-6):offset+6].hex(' '));offset+=1
