import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { XMLParser, XMLBuilder, XMLValidator } from 'fast-xml-parser';
import * as _ from 'lodash';
import { debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'xml-manager';
  parser = new XMLParser();
  options = {
    ignoreAttributes: false,
    ignoreNameSpace: false,
    allowBooleanAttributes: false,
    parseNodeValue: true,
    parseAttributeValue: false,
    trimValues: true,
    cdataTagName: '__cdata',
    cdataPositionChar: '\\c',
    parseTrueNumberOnly: false,
    arrayMode: false
  };

  originalObj: any;
  arrayObj: any;
  displayedData: any;
  availableKeys: string[] = [];
  headers: string[] = [];
  uniqueProperties: any = [];
  currentSearchKey = '';
  form!: FormGroup;

  constructor(private _fb: FormBuilder) { }

  ngOnInit() {
    this.form = this._fb.group({
      search: ['']
    });

    this.form.get('search')?.valueChanges.pipe(debounceTime(800), distinctUntilChanged()).subscribe((value) => {
      this.resetToOriginalValue();

      if (value) {
        console.log('no value');
        const result = this.searchObject(this.arrayObj, value);

        const merged = result.reduce((acc: any, curr: any) => {
          const key = Object.keys(curr)[0];
          acc[key] = acc[key] ? [...acc[key], curr[key]] : [curr[key]];
          return acc;
        }, {});

        this.arrayObj = merged;
      }

    });
  }

  customizer(objValue: any, srcValue: any) {
    if (_.isArray(objValue)) {
      return objValue.concat(srcValue);
    }

    if (objValue) {
      return [objValue, ...srcValue];
    }

    return srcValue;
  }

  test(data: any, header: string) {
    console.log(data);
    console.log(header);

    if (data[header]) {
      return true;
    }

    return false;
  }

  onFileChange(event: any) {
    const files = event.target.files;

    for (let i = 0; i < files.length; i++) {
      const reader = new FileReader();

      reader.onload = () => {
        let xmlText = reader.result;
        let jObj = this.parser.parse(xmlText as string, this.options);

        this.originalObj = _.mergeWith(this.originalObj, this.getObjectArray(jObj)[0], this.customizer);

        this.arrayObj = Object.assign({}, this.originalObj);

        this.availableKeys = Object.keys(this.arrayObj);
        console.log(this.arrayObj);

        this.availableKeys.forEach((key) => {
          this.getUniqueProperties(key);
        });



      };

      reader.readAsText(files[i]);
    }

  }

  resetToOriginalValue() {
    this.arrayObj = Object.assign({}, this.originalObj);
  }

  // recursive function to get all the objects in the xml
  getObjectArray(obj: Record<string, any>) {
    let arr: any[] = [];
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          arr.push(obj[key]);
        } else if (Array.isArray(obj[key])) {
          obj[key].forEach((item: any) => {
            arr.push(...this.getObjectArray(item));
          });
        }
      }
    }
    return arr;
  }

  // grab all unique headers
  getUniqueProperties(objKey: string) {
    // this.uniqueProperties = [];
    const arrayOfObjects = this.arrayObj[objKey];

    if (Array.isArray(arrayOfObjects)) {
      arrayOfObjects.forEach((object: any) => {
        Object.keys(object).forEach(key => {
          if (!this.uniqueProperties.includes(key)) {
            this.uniqueProperties.push(key);
          }
          if (Array.isArray(object[key])) {
            object[key].forEach((item: any) => {
              Object.keys(item).forEach(property => {
                if (!this.uniqueProperties.includes(property)) {
                  this.uniqueProperties.push(property);
                }
              });
            });
          }
        });
      });
    }
    else {
      Object.keys(arrayOfObjects).forEach(key => {
        if (!this.uniqueProperties.includes(key)) {
          this.uniqueProperties.push(key);
        }
        if (Array.isArray(arrayOfObjects[key])) {
          arrayOfObjects[key].forEach((item: any) => {
            Object.keys(item).forEach(property => {
              if (!this.uniqueProperties.includes(property)) {
                this.uniqueProperties.push(property);
              }
            });
          });
        }
      });
    }
  }

  getUniqueProperties2(): string[] {
    return Array.from(new Set(this.uniqueProperties));
  }

  displayData(objKey: string) {
    const arrayOfObjects = this.arrayObj[objKey];

    if (!Array.isArray(arrayOfObjects)) {
      return [arrayOfObjects];
    }
    else {
      return arrayOfObjects;
    }
  }

  /**
  * Function to search through all properties of an object and its nested objects
  * @param {Object} object - The object to search through
  * @param {string} searchTerm - The term to search for
  * @returns {Array} - An array of objects that contain the search term in one of their properties
  */
  searchObject(object: any, searchTerm: string, isChildObj: boolean = false): Array<object> {
    const result: Array<object> = [];
    if (!searchTerm) {
      return object;
    }

    searchTerm = searchTerm.toLowerCase();

    for (const key in object) {
      if (isChildObj == false) {
        this.currentSearchKey = key;
      }

      if (object.hasOwnProperty(key)) {
        const value = object[key];
        if (typeof value === "object") {
          result.push(...this.searchObject(value, searchTerm, true));
        } else if (typeof value === "string" && value.toLowerCase().includes(searchTerm)) {
          result.push({ [this.currentSearchKey]: object });
        }
      }
    }

    return result;
  }

}
