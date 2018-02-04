# Team Synco - Stairs monitor

Monitors traffic and directions on stairs

[Blog](http://ipdl.gatech.edu/doie2016/projects/stair-monitor-team-5ynco/)

This folder holds the source code of the Stairs Monitor.

## Authors

* Diego Osorio
* Shambhavi Mahajan

## System

* Components
  *	USB Battery
  * GrovePi board to connect ultrasonic sensors
  * RaspberryPi 3

* Input
  * 2 x Motion sensor
  * Ultrasonic distance sensor

* Output
  * TingoDB data base
  	* Record of people passing up and down
  	* Record of sensors activity
  * Data visualizaation server
    * Web server using express
    * Sockets server to communicate sensors data with web server, using socketsIO

## Libraries

The following libraries are needed:

#### GrovePi

* Reference: [GrovePi Website](http://www.dexterindustries.com/grovepi/)
* Library: [GrovePi NodeJS Module](https://github.com/marcellobarile/GrovePi)
