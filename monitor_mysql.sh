#!/bin/bash
while true
do
  if ! systemctl is-active --quiet mysql
  then
    echo "MySQL went down at $(date)" >> /home/ubuntu/mysql_monitor.log
    sudo systemctl start mysql
  fi

  # Check current connections
  CONN_COUNT=$(mysql -u root -p'1221' -N -e "show status where Variable_name = 'Threads_connected';" | awk '{print $2}')
  
  if [ "$CONN_COUNT" -gt 140 ]
  then
    echo "Connection limit exceeded ($CONN_COUNT connections) at $(date). Restarting MySQL..." >> /home/ubuntu/mysql_monitor.log
    sudo systemctl restart mysql
  fi
  
  sleep 60
done
