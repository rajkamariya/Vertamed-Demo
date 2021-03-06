import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  OnDestroy,
  HostListener,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { RecordingService } from './recording.service';
import { fadeAnimation } from '../../shared/app.animation';
import { interval, Subscription, timer } from 'rxjs';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { HeaderService } from 'src/app/features/header/header.service';
import { Platform } from '@angular/cdk/platform';
import { SetupService } from '../setup/setup.service';
import { TakescreenshotService } from '../takescreenshot/takescreenshot.service';
import { ConfirmationService } from 'primeng/api';
import { EvolutionService } from '../evaluation/evolution.service';
import { DataService } from 'src/app/shared/shared/data.service';
import { UtilityService } from 'src/app/shared/shared/utility.service';
import { v4 as uuidv4 } from 'uuid';
import { environment } from 'src/environments';
import { NgxOpenCVService, OpenCVState } from 'ngx-opencv';

declare let MediaRecorder;
declare const window: Window &
  typeof globalThis & {
    stream: MediaStream;
  };
declare var cv:any;

@Component({
  selector: 'app-recording-screen',
  templateUrl: './recording-screen.component.html',
  styleUrls: ['./recording-screen.component.scss'],
  animations: [fadeAnimation],
})
export class RecordingScreenComponent implements OnInit, OnDestroy {
  recording = false;
  isScreenShot = false;
  takeScreenshot = false;
  isSidebarOpen = false;
  counterTime = false;
  recordingFinish = false;
  isRunning: boolean;
  videoSource;
  paddingClass: boolean;
  recordingDurationTime: string;
  data = [3, 2, 1, 'go'];
  counter;
  micValue: boolean;
  mediaRecorder;
  recordedBlobs;
  options;
  micCheckedValue: boolean;
  recordedType;
  videoTrack;
  audioTrack;
  time = 0;
  displayTimer;
  videoType;
  deviceInfoId;
  videoTimer: Subscription;
  flashCheckedValue = false;
  isFullScreen: boolean;
  cancelText: string;
  indexDB;
  indexDbSubscription: Subscription;
  startRecordingTime;
  myStyle: SafeHtml;
  brand = environment.branding;
  isDetection:boolean;
  examType:string="";
  @ViewChild('video') videoEle: ElementRef;
  @ViewChild('videoPreview') recordedVideoEle: ElementRef;
  @ViewChild('canvas') canvas: ElementRef;
  @ViewChild('sidenav') sidenav: ElementRef;
  @ViewChild('videoFrame') videoFrame: ElementRef;
  @ViewChild('circlePopup') circlePopup: ElementRef;
  randomNum: string;
  defualtMessageTimeout;
  showDefaultMessage:boolean = true;

  constructor(
    public translateService: TranslateService,
    private router: Router,
    private recordingService: RecordingService,
    private sanitizer: DomSanitizer,
    private headerService: HeaderService,
    private setupSerice: SetupService,
    public platform: Platform,
    private dataservice: DataService,
    private takescreenshotService: TakescreenshotService,
    private confirmationService: ConfirmationService,
    private utility: UtilityService,
    private evolutionService: EvolutionService,
    private _sanitizer: DomSanitizer,
    private ngxOpenCvService:NgxOpenCVService
  ) {
    this.headerService.muteUnmuteMic.subscribe((res) => {
      this.micValue = res;
      this.muteVideo();
    });
    this.deviceInfoId = this.setupSerice.cameraIdInformation;

    this.headerService.videoFullscreen.subscribe((fullscreenValue) => {
      this.isFullScreen = fullscreenValue;
    });
  }

  @HostListener('document:click', ['$event'])
  clickout(event: Event): void {
    if (
      this.isSidebarOpen &&
      !this.sidenav.nativeElement.contains(event.target)
    ) {
      this.isSidebarOpen = false;
      this.headerService.isInfoOpen = false;
    }
  }

  ngOnInit(): void {
    this.myStyle = this._sanitizer.bypassSecurityTrustHtml(
      `<style>
      #sidebar__content h1 {font-size: ${this.branding.sidebarTitle.fontSize} !important;color: ${this.branding.sidebarTitle.color};font-weight: ${this.branding.sidebarTitle.fontWeight};font-family: ${this.branding.sidebarTitle.fontFamily};}
      #sidebar__content h2 {font-size: ${this.branding.contentTextTitle.fontSize};color: ${this.branding.contentTextTitle.color};font-weight: ${this.branding.contentTextTitle.fontWeight};font-family: ${this.branding.contentTextTitle.fontFamily};}
      #sidebar__content p {font-size: ${this.branding.contentText.fontSize} ;color: ${this.branding.contentText.color} ;font-weight: ${this.branding.contentText.fontWeight};font-family: ${this.branding.contentText.fontFamily};}
      #sidebar__content ul{font-size: ${this.branding.contentText.fontSize} ;color: ${this.branding.contentText.color} ;font-weight: ${this.branding.contentText.fontWeight};font-family: ${this.branding.contentText.fontFamily};}
      .p-dialog.p-confirm-dialog .p-confirm-dialog-message{font-size: ${this.branding.contentText.fontSize} !important;color: ${this.branding.contentText.color};font-weight: ${this.branding.contentText.fontWeight};font-family: ${this.branding.contentText.fontFamily};}
      .p-inputswitch.p-inputswitch-checked .p-inputswitch-slider:before {background: ${this.branding.UIElementSecondColor} !important; }
      .header__left--duration-icon{color: ${this.branding.UIElementRecording} !important; }
      .p-inputswitch .p-inputswitch-slider:before {background: ${this.branding.UIElementPrimaryColor} !important; }</style>`
    );
    this.randomNum = uuidv4();
    this.ngxOpenCvService.cvState.subscribe((cvState:OpenCVState)=>{
      if(cvState.ready){
        this.initRecording();
      }
    }) 
  }

  initRecording() {
    this.translateService
      .get('recordingPage.cancelText')
      .subscribe((text: string) => {
        this.cancelText = text;
      });

    // const obs = interval(1000);
    // const timerSub: Subscription = obs.subscribe((d) => {
    //   // this.counterTime = true;
    //   const counterText = this.data[d];
    //   this.counter = counterText;
    // });
    setTimeout(() => {
      this.startCamera();
    }, 500);
    this.micCheckedValue = this.headerService.muteMic;
    this.flashCheckedValue = this.headerService.flash;
    this.recordingDurationTime = '00:00';
  }
  onFinish(): void {
    this.isDetection = false;
    this.recordingService.fullscreen = false;
    this.isSidebarOpen = false;
    this.isRunning = false;
    this.stopRecording();
    setTimeout(() => {
      this.recordingFinish = true;
    }, 1000);
    this.videoTrack.stop();
    this.audioTrack.stop();

    this.dataservice.preserveQueryParams('/takescreenshot');
  }

  onSlidebarOpen(value: boolean): void {
    this.isSidebarOpen = value;
  }

  onSlidebarClose(): void {
    this.isSidebarOpen = false;
    this.headerService.isInfoOpen = false;
  }

  playVideo(): void {
    if (this.platform.SAFARI) {
      this.recordedType = { type: 'video/mp4' };
    } else {
      this.recordedType = { type: 'video/webm' };
    }
    const superBuffer = new Blob(this.recordedBlobs, this.recordedType);
    this.videoSource = window.URL.createObjectURL(superBuffer);
  }

  muteVideo(): void {
    if (window.stream && window.stream.getAudioTracks().length > 0) {
      window.stream.getAudioTracks()[0].enabled =
        !window.stream.getAudioTracks()[0].enabled;
    }
  }

  handleDataAvailable(event: { data }): void {
    const table = [];
    if (event.data && event.data.size > 0) {
      table.push(event.data);
    }
    this.recordedBlobs = table;
  }

  startRecording(): void {
    this.startRecordingTime = new Date(new Date().toUTCString()).toISOString();
    this.stopwatch();
    this.isRunning = true;
    this.videoEle.nativeElement.volume = 0;
    if (this.platform.SAFARI) {
      this.options = { mimeType: 'video/mp4' };
      this.videoType = { type: 'video/mp4' };
    } else {
      this.options = { mimeType: 'video/webm' };
      this.videoType = { type: 'video/webm' };
    }
    try {
      this.mediaRecorder = new MediaRecorder(window.stream, this.options);
    } catch (e) {
      console.error('Exception while creating MediaRecorder:', e);
      return;
    }
    this.mediaRecorder.onstop = (event) => {
      const endRecordingTime = new Date(new Date().toUTCString()).toISOString();

      this.dataservice.recordingStartTime = this.startRecordingTime;
      this.dataservice.recordingEndTime = endRecordingTime;

      this.recordedBlobs = event.target.recordedBlobs;
      const superBuffer = new Blob(this.recordedBlobs, this.videoType);
      this.dataservice.videoData = {
        mimeType: this.videoType.type,
        blob: superBuffer,
      };
      const reader = new FileReader();
      reader.readAsDataURL(superBuffer);
      reader.onloadend = () => {
        const base64data = reader.result;
        this.dataservice.displayTimer = this.displayTimer;
        this.videoSource = this.sanitizer.bypassSecurityTrustResourceUrl(
          URL.createObjectURL(this.dataservice.videoData.blob)
        );
      };
    };

    this.mediaRecorder.ondataavailable = this.handleDataAvailable;
    this.mediaRecorder.start();
  }

  stopwatch(): void {
    this.videoTimer = timer(0, 1000).subscribe(() => {
      if (this.isRunning) {
        this.time++;
        this.getDisplayTimer(this.time);
      }
    });
  }

  getDisplayTimer(time: number): void {
    let hours = '' + Math.floor(time / 3600);
    let minutes = '' + Math.floor((time % 3600) / 60);
    let seconds = '' + Math.floor((time % 3600) % 60);

    if (Number(hours) < 10) {
      hours = '0' + hours;
    } else {
      hours = '' + hours;
    }
    if (Number(minutes) < 10) {
      minutes = '0' + minutes;
    } else {
      minutes = '' + minutes;
    }
    if (Number(seconds) < 10) {
      seconds = '0' + seconds;
    } else {
      seconds = '' + seconds;
    }

    this.displayTimer = minutes + ':' + seconds;
    this.recordingDurationTime = this.displayTimer;
    this.recordingService.finalRecordDuration = this.displayTimer;
    this.recordingService.recordTimeDuration.next(this.displayTimer);
  }

  stopRecording(): void {
    this.mediaRecorder.stop();
  }

  pauseRecording(): void {
    this.mediaRecorder.pause();
  }

  resumeRecording(): void {
    this.mediaRecorder.start();
  }
  
  handleSuccess(stream: MediaStream): void {
    window.stream = stream;
    const gumVideo = this.videoEle.nativeElement;
    gumVideo.srcObject = stream;
  }
  detection(){
    setInterval(()=>{
      if(this.isDetection)
      {
        if(this.videoEle.nativeElement.videoHeight>0){
          this.circleDetection();
        }
      }
    },0);
  }
  circleDetection(){
    this.videoEle.nativeElement.height = this.videoEle.nativeElement.offsetHeight;
    this.videoEle.nativeElement.width = this.videoEle.nativeElement.offsetWidth;

    let src = new cv.Mat(this.videoEle.nativeElement.height,this.videoEle.nativeElement.width,cv.CV_8UC4)
    let srccap = new cv.VideoCapture(this.videoEle.nativeElement);
    srccap.read(src);

    let dst = new cv.Mat(this.videoEle.nativeElement.height,this.videoEle.nativeElement.width,cv.CV_8UC4)
    let dstcap = new cv.VideoCapture(this.videoEle.nativeElement);
    dstcap.read(dst);

    cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY);
    let msize = new cv.Size(3, 3);
    cv.GaussianBlur(src,src,msize,0)
    cv.medianBlur(src,src,3) 

    cv.Canny(src, src, 10, 100, 3, false);    
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();

    let redColor = new cv.Scalar(255, 0, 0, 255);
    let greenColor = new cv.Scalar(0, 255, 0, 255);

    cv.findContours(src,contours,hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
    // cv.drawContours(dst, contours, -1, redColor, 1, 8, hierarchy, 1)
    let circles =[];
    // console.log(contours.size())
    for (let i = 0; i < contours.size();i++) {
      let cnt = contours.get(i);
      if(cv.contourArea(cnt)>2000)
      {
        // console.log(cv.contourArea(cnt));
        let tmp = new cv.Mat();
        cv.convexHull(cnt, tmp, false, true);

        if(tmp.total()>8){
          let circle = cv.minEnclosingCircle(cnt);
          let circleArea = (3.14*circle.radius*circle.radius)-((3.14*circle.radius*circle.radius)*25/100);
          if(circleArea>0){
            let bottomEdge = this.videoEle.nativeElement.offsetWidth;
            let circleBottomY = circle.center.y+circle.radius;
            if(circleBottomY < bottomEdge){
              if(cv.contourArea(tmp)>circleArea)
              {
                if(circle.radius > 25){
                  circles.push(i);
                  break;
                }
              }
            }
          }
        } 
        tmp.delete();
      }
      cnt.delete(); 
    }
    
    if(circles.length === 0){
      this.circlePopup.nativeElement.style.visibility = "visible";
      if(this.showDefaultMessage){  
        this.circlePopup.nativeElement.style.color = "red";
        this.circlePopup.nativeElement.innerHTML = "Please place circular gauze into the middle of your camera view";
      }
    }else if(circles.length > 0){
      this.showDefaultMessage = false;
      if(this.defualtMessageTimeout){
        clearTimeout(this.defualtMessageTimeout);
      }
      this.defualtMessageTimeout=setTimeout(()=>{
        this.showDefaultMessage = true;
      },2000);
      
      let cnt = contours.get(circles[0]);
      let circle = cv.minEnclosingCircle(cnt);
      cnt.delete();
      this.examType = "Exam";
      let color;
      if(circle.radius<45){
        this.circlePopup.nativeElement.style.visibility = "visible";
        this.circlePopup.nativeElement.style.color = "red";
        this.circlePopup.nativeElement.innerHTML = "Please bring the gauze closer to your camera view";
        color = redColor;
        cv.drawContours(dst, contours, circles[0], redColor, 2, cv.LINE_8, hierarchy, 0);
      }else{
        let leftEdge = this.videoEle.nativeElement.offsetWidth*20/100;
        let rightEdge = this.videoEle.nativeElement.offsetWidth*80/100;
        let circleLeftX = circle.center.x-circle.radius;
        let circleRightX = circle.center.x+circle.radius;
          
        if(circleLeftX > leftEdge && circleRightX < rightEdge){
          this.circlePopup.nativeElement.style.visibility = "visible";
          this.circlePopup.nativeElement.style.color = "green";
          this.circlePopup.nativeElement.innerHTML = "Now start performing your "+this.examType.toLowerCase()+" circular cutting task";
          cv.drawContours(dst, contours, circles[0], greenColor, 2, cv.LINE_8, hierarchy, 0);
        }else{
          this.circlePopup.nativeElement.style.visibility = "visible";
          this.circlePopup.nativeElement.style.color = "red";
          this.circlePopup.nativeElement.innerHTML = "Please position your gauze in the middle of your camera view";
          cv.drawContours(dst, contours, circles[0], redColor, 2, cv.LINE_8, hierarchy, 0);
        }
      }
    }

    cv.imshow('videoFrame', dst);
    src.delete();
    dst.delete();
    contours.delete();
    hierarchy.delete();
  }

  async init(constraints: MediaStreamConstraints): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.videoTrack = stream.getVideoTracks()[0];
      this.audioTrack = stream.getAudioTracks()[0];
      this.handleSuccess(stream);
      this.isDetection = true;
        this.detection();
      return null;
    } catch (e) {
      console.error('navigator.getUserMedia error:', e);
      return null;
    }
  }

  async startCamera(): Promise<void> {
    this.videoEle.nativeElement.volume = 0;
    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
      },
      video: {
        facingMode: 'environment',
        deviceId: this.deviceInfoId ? { exact: this.deviceInfoId } : undefined,
      },
    };
    await this.init(constraints);
    this.counterTime = true;
    clearTimeout(this.dataservice.intervalId);
    this.dataservice.intervalId = setTimeout(() => {
      this.startRecording();
      this.paddingClass = true;
      this.counterTime = false;
      setTimeout(() => {
        if (this.headerService.muteMic === false) {
          if (window.stream.getAudioTracks().length > 0) {
            window.stream.getAudioTracks()[0].enabled = false;
          }
        }
      }, 100);
    }, 9000);
  }

  videoInitialize(): void {
    this.headerService.muteUnmuteMic.subscribe((res) => {
      this.micValue = res;
    });
  }

  takescreenshot(): void {
    this.isScreenShot = true;

    setTimeout(() => {
      this.isScreenShot = false;
    }, 3000);
    this.canvas.nativeElement
      .getContext('2d')
      .drawImage(this.videoEle.nativeElement, 0, 0, 640, 480);

    const vidStyleData = this.videoEle.nativeElement.getBoundingClientRect();
    this.canvas.nativeElement.style.width = vidStyleData.width + 'px';
    this.canvas.nativeElement.style.height = vidStyleData.height + 'px';
    this.canvas.nativeElement.style.left = vidStyleData.left + 'px';
    this.canvas.nativeElement.style.top = vidStyleData.top + 'px';

    this.recordingService.sceenShots.push(
      this.utility.getImageBlob(
        this.canvas.nativeElement.toDataURL('image/png')
      )
    );
  }

  // redirectToPhoto(): void {
  //   this.dataservice.preserveQueryParams('/takescreenshot');
  // }

  confirm(): void {
    if (this.paddingClass) {
      this.confirmationService.confirm({
        message: this.cancelText,
        accept: () => {
          this.isDetection = false;
          this.evolutionService.setCancelValue(true);
          this.router.navigate(['/end']);
        },
      });
    } else {
      this.isDetection = false;
      this.dataservice.preserveQueryParams('/setup');
    }
  }
  onCancelExersice(): void {
    this.confirmationService.confirm({
      message: this.cancelText,
      accept: () => {
        this.isDetection = false;
        this.evolutionService.setCancelValue(true);
        this.router.navigate(['/end']);
      },
    });
  }

  ngOnDestroy(): void {
    clearTimeout(this.dataservice.intervalId);
    if (
      !this.appData.recordingPath &&
      window.stream &&
      window.stream.getTracks()
    ) {
      this.headerService.videoFullscreen.next(false);
      window.stream.getTracks()[0].stop();
      if (this.videoTimer) {
        this.videoTimer.unsubscribe();
      }
    }
  }

  get appData() {
    return this.dataservice.appData;
  }

  get branding() {
    return this.dataservice.branding;
  }
}
