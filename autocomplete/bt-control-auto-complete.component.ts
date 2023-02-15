import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectorRef, TemplateRef } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import sha1 from 'crypto-js/sha1';
import { BtCollection } from 'src/app/ng-buyton/classes/collection/collection';
import { BtAutocompleteCustomTmpl } from './types/BtAutocompleteCustomTmpl';
import { BtTOption } from './types/BtTOption';
import { BtTPredictQuery } from './types/BtTPredictQuery';

@Component({
  selector: 'bt-control-autocomplete',
  templateUrl: './bt-control-auto-complete.component.html',
  styleUrls: ['./bt-control-auto-complete.component.css']
}) 

export class BtControlAutoCompleteComponent implements OnInit {
  @Input()btValue; //value
  @Input()btList = [];
  @Input()btBounds:{id:string,label:string} = null;
  @Input()btQuery:BtTPredictQuery
  @Input()btCustomTemplate:BtAutocompleteCustomTmpl;
  @Input()btPlaceHolder = 'הכנס ערך...';
  @Input()btType; //html input type
  @Input()btDisabled; //html disabled
  @Input()btWidth;
  @Input()btHeight;
  @Input()btValueNotInListStrategy:'allow'|'add-to-list'|'reject' = 'reject';
  
  @Output()btBlur = new EventEmitter();
  @Output()btChanges = new EventEmitter();
  @Output()btInput = new EventEmitter();
  @Output()btFocus = new EventEmitter();

  id:string = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
  input:HTMLInputElement;
  isChanged:boolean = false;
  filteredOptions:BtTOption[] = []
  nonFilteredOptions:BtCollection<'id'|'label'|'addedToList'|'fullObjForTmpl'> = new BtCollection([]);
  valueSelected:BtTOption = {id:null,label:null};
  queryResponse:any[] = [];
  _hashList;
  _hashQuery;
  value;
  lockScroll:boolean = false;
  constructor(private ref:ChangeDetectorRef,private sanitizer:DomSanitizer) { }

  ngOnInit(): void {
    this.ref.detach();
    this._setDefaultValues();
    this._hashList = sha1(JSON.stringify(this.btList)).words[0];
    this._hashQuery = sha1(JSON.stringify(this.btQuery)).words[0];
    this._initializeDropdownAndValue();
    // console.log(this.valueSelected,this.btValue)
  }

  
  ngAfterViewInit(){
    this.input = <HTMLInputElement> document.getElementById(this.id);
   }

  ngOnDestroy(){
  }

  onFocus(e:Event){
    // console.log(this.btValue)
    e.stopPropagation();
    this.btFocus.emit();
    if(this.btList){
      /**בנצי-24/11/21, נראה לי מיותר */
      // this.filteredOptions = this._filter(this.valueSelected.label)
      this._buildDropdown(this.btList);
    }
    // console.log(this.btValue,this.btValue?.length , this._minCharsToFetch(),this.btQuery.minCharsToFetch)
    if(this.btQuery && this._hasToFetchQuery('focus',this.btValue)){
        this._fetchAndBuildDropdown(this.btValue)
      } //למקרה שרוצים לפתוח בלי
      // else if(this.btQuery && this.queryResponse){
      //   this._buildDropdown(this.queryResponse)
      // }
      // console.log(this.btValue) 
  }

  onBlur(event){
    // console.log(event,this.valueSelected,this._isSelectedValueInList())
    // let isSelectedValueInList = this._isSelectedValueInList();
    // event.target.value=''
    // console.log(this._getNonFilteredLabelsAsArray(),this.valueSelected,(this._isSelectedValueInList()))
    /**if is change value to empty, is alwais avlibale */
    /**for select without mouse */
    const valueInList = this.findOption('label',this.input.value)
    const isSelectedValueInList = !!valueInList
    if(this.input.value !== this.valueSelected.label
      && this.input.value !== this.valueSelected.id
      && isSelectedValueInList){
      this.onSelectAutocomplete(valueInList);
      // console.log(this.valueSelected)
    }


    if( this.btValue
      && this.input.value === '')
      this.btChanges.emit('');
      // else if((this.btValueNotInListStrategy === 'reject'
      // ||this.btValueNotInListStrategy === 'add-to-list')
      // && this.input.value !== this.valueSelected.label)this.input.value =  this.btValue || '';
      /**if selected from list or is added or allow news and is changed*/
    else if((isSelectedValueInList
        || this.valueSelected.addedToList
        || this.btValueNotInListStrategy === 'allow')
        /**בודק שהשתנה ערך נבחר לעומת הערך הקודם */
        && this.valueSelected.id !== this.btValue)
      this._emitSelectedValue();
    
    else if(this.btValueNotInListStrategy === 'reject'
        ||this.btValueNotInListStrategy === 'add-to-list'){
      this.input.value =  this.valueSelected.label || '';}   
    // console.log(this.btValue,this.valueSelected)
    this.detectChanges();
  }



  onInput(event){
    let val = event.target.value;
    //בנצי?
    // this._utilities.setSelectedLabel(val,this);
    // this._utilities.setSelected({id:val,label:val},this);
    
    // if(this.btValueNotInListStrategy === 'add-to-list' ){
    //     this._utilities.removeAddedToList(this);
    //     this.nonFilteredOptions.unshift({id:val,label:val,fullObjForTmpl:{},addedToList:true})
    // }
    // console.log(this.input?.value)
    /**if allow, we will save the data immediately, so as not to lose it */
    if(this.btValueNotInListStrategy === 'allow'){
      this._utilities.setSelected({id:val,label:val},this);}
    /**refilter dropdown */
    if(this.btList || !this.btQuery?.refetchEveryInput)
      this.filteredOptions = this._filter(val)
    else if(this._hasToFetchQuery('input',val)){
          this._fetchAndBuildDropdown(val);
    }/**if no fetch, remove old if exists, for not view.*/
    else this._resetOptions();
    
    this.isChanged = true;
    this.btInput.emit(val)
    this.detectChanges();
    this._utilities.setTimeOutDetectChanges(100,this);
  }

  onSelectAutocomplete(option:BtTOption){
    /**if its 'added' (new option), we will fill it from the input */
    if(option.addedToList){
      option.id = this.input.value;
      option.label = this.input.value;
    }
    this.valueSelected = option;
    this.detectChanges();
    //בנצי? אולי עבור מקרה שנסגר המסך לפני שעזב
    this._utilities.setTimeOutBlur(200,this);
   }

  onKey(e){
    //return;
    this.detectChanges();
    let keyCode = e.keyCode;
    // console.log(keyCode)
    if(keyCode > 36 && keyCode < 41 )
        e.stopPropagation();
    if(keyCode === 13 || keyCode === 27){
       e.stopPropagation();
       this.detectChanges();
      setTimeout(()=>{
        // if(this.input.value && this.nonFilteredOptions.findFirst('label',this.input.value))
        //   this.valueSelected = this.nonFilteredOptions.findFirst('label',this.input.value)
        this.input.blur();
      },0)
    }
  }
  showWarningNotInList(){
    // return false;
    // /**for is added row in table */
    // setTimeout(() => {
      // console.log(this.valueSelected,this.valueSelected.label === null)
      if(this.valueSelected.label !==this.btValue && this.valueSelected.id !==this.btValue)
      //   this.valueSelected.label === '' 
      //  || this.valueSelected.label === null
      //  || this.valueSelected.label === undefined 
      //  || this.btValueNotInListStrategy === 'allow' 
      //  || this._isSelectedValueInList())
      //  return false
    return true;
    return false
    // }, 1000);
    
  }

  getCustomTmplHtml(option:BtTOption){
    let html:any
    if(option.addedToList)  
    html = `<div class = "text-primary">
      <span class = "pointer" >
          הוסף את ${this.input.value}
      </span>
    </div>`;
    else {
      html = this.btCustomTemplate.template;
      if(typeof html === 'function')
          html = html(option);
    }
    return this.sanitizer.bypassSecurityTrustHtml(<string>html);
  }

  detectChanges(){
    this.ref.detectChanges();
  }

  
  

   private _setDefaultValues(){
      if(!this.btValue)
          this.btValue = '';
     /* if(typeof this.btValue !== 'string'){
        try{
          this.btValue = this.btValue.toString()
        }
        catch{
          throw(`btValue must be of type 'string' or at least 'string' convertable.`)
        }
      }*/
      if(!this.btType)
         this.btType = 'text'
      if(!this.btWidth)
         this.btWidth = null;
   }

   private  _initializeDropdownAndValue(){
    this._utilities.setSelected({id:this.btValue,label:this.btValue},this);
    this._initializeDropdown();
   }

   private _initializeDropdown(){
    if(this.btList){
      this._buildDropdown(this.btList);
      return;
    }
    else if(this.btQuery?.mode === 'observable'){ }
    else if(this._hasToFetchQuery('init',this.btValue)){
       this._fetchAndBuildDropdown(this.btValue) 
      } 
    else {
      this.detectChanges();
      }
   }

   private _hasToFetchQuery(caller:'init'|'focus'|'input'|'over',val){
     /**Defined to 0 because if it is undefined, it is not possible to equate >= below*/
    let lenOfValue = val?.length || 0;
    if(!lenOfValue && val) 
      return false;
    // if(caller === 'init'
    //   && lenOfValue
    //   &&this.btQuery?.mode === 'url')
    //   return true;
    if(this.btQuery?.refetchEveryInput 
          && lenOfValue >= this._minCharsToFetch() 
          && caller === 'input') 
      return true;
    if(this.btQuery?.mode === 'url' 
      && lenOfValue >= this._minCharsToFetch() 
      && this.btQuery.fetchOn === caller 
    )return true;
    return false;
   }

   private _getQueryUrl(predict):string{ 
    let url = this.btQuery.url;
    if(typeof this.btQuery.url === 'function')
      url = this.btQuery.url(predict);
    return <string>url;
   }

   private _buildDropdown(list,refresh = true){
      this._resetOptions();
      if(list[0] && typeof list[0]  === 'string'){
          this._initializeOptionsFromStringArr(list);
      } 
      else if(list[0] && typeof list[0]  === 'object'){
          this._initializeOptionsFromObjectArr(list,refresh);
      } 
      // else {this._resetOptions();}
      if(this._utilities.doAddOptionForNotInList(this)){
          this.filteredOptions = <BtTOption[]>[this._utilities.createOptionForNotInList(this),...this.nonFilteredOptions.get()];}
      else this.filteredOptions = <BtTOption[]>this.nonFilteredOptions.get();
       /**loock scrolling when dropdown build */
      this.lockScroll = true;
      this.detectChanges();
      setTimeout(()=>{
        this.lockScroll = false;
      })
    }
   

   private _minCharsToFetch(){
     if(!this.btQuery.minCharsToFetch) 
        return -1
     return this.btQuery.minCharsToFetch;
   }

   private _fetchAndBuildDropdown(predict = ""){
    let url = this._getQueryUrl(predict)
       fetch(url).then(res =>{
         res.json().then(res =>{
           if(res.error){console.log('error'); return}
          this._buildDropdown(res[this.btQuery.responseProperty],false)
          this.queryResponse = res[this.btQuery.responseProperty];
          });
       })
     }

   private _initializeOptionsFromStringArr(list){
    list.map((option:any) => {
      this.nonFilteredOptions.push({id:option,label:option})
    })
   }
  
  private _initializeOptionsFromObjectArr(list,refreshLabel = true){
    list.map(option => {
      let label;
      let id;
      if(!this.btBounds){
        let keys = Object.keys(option);
        id = keys[0];
        label = (keys[1])?(keys[1]):(keys[0]);
      }
      if(this.btBounds){
        id = this.btBounds.id;
        label = this.btBounds.label;
      }
      if(!id) 
         return;
      if(!label) label = id;
      let aOption:BtTOption = {id:option[id],label:option[label]};
      if(this.btCustomTemplate)
         aOption.fullObjForTmpl = option;
      this.nonFilteredOptions.push(aOption)
      // this._utilities.removeAddedToListIfAlreadyInList(option[label],this);
      if(refreshLabel)
         this._utilities.setLabelFromOption(option[id],option[label],this);
      })
    }

  private _resetOptions(){
    // let initialOptions = (this.btValueNotInListStrategy === 'add-to-list')
    //                ?(this._utilities.createOptionForNotInList(this)):([])
    // this.nonFilteredOptions.set(initialOptions);
    this.nonFilteredOptions.set([]);
    this.filteredOptions=[]
  }

  private _getNonFilteredLabelsAsArray():any[]{
    return this.nonFilteredOptions.asArray('label');
  }

  private _isSelectedValueInList(v=null){
    if (this.nonFilteredOptions 
          && this._getNonFilteredLabelsAsArray()
             .includes(v||this.valueSelected?.label))
        return true;  
    return false;
  }

  
  private findOption(prop,v){
    return this.nonFilteredOptions.findAll(prop,v)
  }

  private _emitSelectedValue(){
    // this.btValue = this.valueSelected.id;
    return (!this.btCustomTemplate)?(this._emitSelectedId()):(this._emitSelectedObj());
  }

  private _emitSelectedId(){
    this.btChanges.emit(this.valueSelected.id)
  }

  private _emitSelectedObj(){
    this.btChanges.emit(this.valueSelected)

  }

 private _filter(value: string):any{
    if(!value)
     return this.nonFilteredOptions.get();
    const filterValue = this._normalizeValue(value);
    return this.nonFilteredOptions.get().filter(option => 
       this._normalizeValue(option.label)?.includes(filterValue));
  }

  private _normalizeValue(value: string): string {
    return value?.toLowerCase().replace(/\s/g, '');
  }

  private _utilities = {
    setTimeOutDetectChanges(timeout:number,instance){
       setTimeout(()=>{
         instance.detectChanges();
       },timeout)
    },
    setTimeOutBlur(timeout:number,instance){
      setTimeout(()=>{
        instance.input.blur();
      },timeout)
   },
    setSelectedId(val,instance){
      instance.valueSelected.id = val;
    },
    setSelectedLabel(val,instance){
      instance.valueSelected.label = val;
    },
    setSelected(option:BtTOption,instance){
      instance.valueSelected = option;
    },
    createOptionForNotInList(instance){
      let curr = this.input?.value || '';
      return {id:curr,label:curr,fullObjForTmpl:{},addedToList:true}
      // let option = (instance.valueSelected.label)
    //  ?([{id:curr,label:curr,fullObjForTmpl:{},addedToList:true}])   /**{id:curr,label:curr,fullObjForTmpl:{}} */
    //   :([]);return option;
    },
    doAddOptionForNotInList(instance){
      return instance.btValueNotInListStrategy === 'add-to-list'
        // && instance.input.value?.length >= instance._minCharsToFetch() 
        && !instance._isSelectedValueInList(instance.input?.value)//this.input.value !== this.nonFilteredOptions.get()[0]?.label
    },
    removeAddedToList(instance){
       let nfOption = instance.nonFilteredOptions.get();
       if(nfOption[0] && nfOption[0].addedToList) {
          nfOption.splice(0,1);
          instance.nonFilteredOptions.set(nfOption);
      }
     },
     removeAddedToListIfAlreadyInList(optionLabel,instance){
       let nfOptions = instance.nonFilteredOptions?.get()
       if(
          instance.btValueNotInListStrategy === 'add-to-list' 
         && optionLabel === nfOptions[0]?.label
         ){
          instance._utilities.removeAddedToList(instance)
       }
     },
     setLabelFromOption:(optionId,optionLabel,instance)=>{
     if(optionId && optionId === this.valueSelected.id)
        instance._utilities.setSelectedLabel(optionLabel,instance);
     }
   }

   ngOnChanges(e){
    if(e.btList &&  sha1(JSON.stringify(this.btList)).words[0] !== this._hashList){
     this._initializeDropdown();
     this._hashList = sha1(JSON.stringify(e.btList.currentValue)).words[0]
   }

   if(e.btQuery &&  sha1(JSON.stringify(this.btQuery)).words[0] !== this._hashQuery){
    this._initializeDropdown();
    this._hashQuery = sha1(JSON.stringify(this.btQuery)).words[0]
  }
   
   if(e.btValue && this.nonFilteredOptions){
       let match = this.nonFilteredOptions.findFirst('id',this.btValue);
         if(match){
           this._utilities.setSelected(match,this);
         } else {
           this._utilities.setSelected({id:this.btValue,label:this.btValue},this)
         }
         this.detectChanges();
   }
 }

 
}

/*
 //
    /*if(this.enter){
      document.getElementById(this.id).focus();
    }
    
 /*ngDoCheck(){
  //this._initList();
 }


onDblClick(){
  this.dblClicked = true;
  this.filteredOptions = [];
  setTimeout(()=>{
    this.dblClicked = false;
  },1000)}
  */
 //dblClicked:boolean = false;
 //this.filteredOptions.splice(0,1);
          //this.filteredOptions.unshift({id:val,label:val,fullObjForTmpl:{},addedToList:true})
/*if(this.input)
        this.input.style.width  = this.btWidth.toString() + 'px';*/
 /*private _initList(){
    /*if(this.btAutocompleteObservable ){
      let fetch = this.btAutocompleteObservable;
      if(fetch !== undefined && fetch.subscribe !== undefined){
        setTimeout(()=>{
          fetch.subscribe(res => {
            this.filteredOptions = res;
          })
        },2000)
       }
    }
    if(this.btList){
      if(this.btList[0] 
        && typeof this.btList[0]  === 'string'){
          this._initializeOptionsFromStringArr();
          this.valueSelected.label = this.valueSelected.id;
        }
    if(this.btList[0] 
          && typeof this.btList[0]  === 'object')
          this._initializeOptionsFromObjectArr();
    }
//@Input()btAutocompleteObservable;
//@Input()enter:boolean = false;
//
//this.filteredOptions = _initial;
    
    this.filteredOptions = this.nonFilteredOptions.get();//this._filter(this.valueSelected.label);
    this.detectChanges();
  }*/

  /*private _blurOnScroll(){
    console.log('scroll?')
   /* if(!this.lockScroll)
       this.input.blur();
  }*/