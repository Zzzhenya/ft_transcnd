## VM & Docker Cleanup Guide
### Problem: 
VM wächst ständig bei Docker-Entwicklung
Bei Docker-Entwicklung in VirtualBox VMs wächst die VM-Datei kontinuierlich, auch nach dem Löschen von Containern und Images. Grund: VM-Festplatten schrumpfen nicht automatisch, selbst wenn Daten gelöscht werden.

### Lösung:
- Inerhalb der VM 
```bash
# Schreibe Datei mit NULL und lösche dies 
dd if=/dev/zero of=/var/tmp/bigemptyfile bs=4096k ; rm /var/tmp/bigemptyfile
```
- Auserhalb der VM
```plaintext
VBoxManage modifymedium disk "/path/to/your/vm.vdi" --compact
```