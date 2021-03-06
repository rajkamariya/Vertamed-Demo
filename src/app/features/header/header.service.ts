import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class HeaderService {
  videoFullscreen = new Subject<boolean>();
  muteUnmuteMic = new Subject<boolean>();
  flashToggled = new Subject<boolean>();
  muteMic = false;
  flash = false;
  isInfoOpen: boolean;
}
