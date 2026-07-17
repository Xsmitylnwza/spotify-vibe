# Personal Scheduled Presence

This context describes a single-owner local utility that selects a customized Discord Rich Presence Scene from recurring daily local-time rules.

## Language

**App Owner**:
The only person who configures and runs the local application.
_Avoid_: Member, User, customer

**Scene**:
A reusable configuration of Discord Rich Presence text, assets, timestamps, links, and buttons.
_Avoid_: Status, profile, canvas

**Daily Time Slot**:
A recurring local start time that selects one Scene every day until the next enabled slot begins.
_Avoid_: Schedule event, calendar event, appointment

**Scheduled Presence**:
The Scene selected by the currently active Daily Time Slot.
_Avoid_: Custom Status, automatic profile

**Manual Override**:
A temporary Scene selection that replaces Scheduled Presence until the next enabled Daily Time Slot begins or the App Owner cancels it.
_Avoid_: Permanent override, paused schedule

**Presence Studio**:
The local web interface used to edit Scenes and Daily Time Slots and to inspect runtime health.
_Avoid_: Hosted website, dashboard

**Editing Scene**:
The Scene currently loaded in the Presence Studio form and Editing Preview. It may differ from the Live Scene.
_Avoid_: Live draft, published Scene

**Live Scene**:
The Scene currently selected for Discord by either a Manual Override or Scheduled Presence.
_Avoid_: Editing Scene, Custom Status

**Editing Preview**:
The Discord-style card rendered from the current form values. It updates immediately but is not, by itself, proof that those values are live on Discord.
_Avoid_: Live preview, Discord screenshot

**Background Companion**:
The local Windows process that starts automatically, watches the system clock, connects to Discord Desktop, and applies Scheduled Presence.
_Avoid_: Bot, cloud worker, Discord plugin
