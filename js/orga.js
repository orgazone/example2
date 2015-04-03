if (!window.orga) {
    window.orga = {
        registerApp: function() {
            var that = this;
            var date = new Date();
            var uniqueId = date.getFullYear() + "" + date.getMonth() + "" + date.getDate() + "" + date.getHours();
            uniqueId += date.getMinutes() + "" + date.getSeconds() + "-" + Math.floor((Math.random() * 1000) + 1);
            that.database.storeRegId(uniqueId);
        },
        /**
         * Date time picker section
         */
        selectedDate: null,

        dateTimePicker: {
            init: function(timestamp) {
                var today;
                var currentValueDate, currentValueTime;
                if (timestamp != undefined) {
                    today = new Date(timestamp);
                    //currentValueDate = today.getDate() + "/" + (today.getMonth() + 1) + "/" + today.getFullYear();
                    currentValueDate = today.getFullYear() + "/" + (today.getMonth() + 1) + "/" + today.getDate();
                    currentValueTime = today.getHours() + ":" + today.getMinutes();
                } else {
                    today = new Date();
                    //currentValueDate = today.getDate() + "/" + (today.getMonth() + 1) + "/" + today.getFullYear();
                    currentValueDate = today.getFullYear() + "/" + (today.getMonth() + 1) + "/" + today.getDate();
                    currentValueTime = today.getHours() + ":" + today.getMinutes();
                }



                //Date picker init
                $('#dateTimeNote').datetimepicker({
                    format: 'Y/m/d H:i',
                    formatDate: 'Y/m/d',
                    dayOfWeekStart: 1,
                    lang: 'en',
                    startDate: currentValueDate,
                    value: currentValueDate + " " + currentValueTime,
                    step: 10,
                    onChangeDateTime: function(dp, $input) {
                        orga.selectedDate = dp;
                    }
                });
            },
        },

        //Form validation before saving
        validateForm: function(timestamp, title, message) {

            if (timestamp == null || title.trim() == "" || message.trim() == "") {
                alert('Please enter complete form.');
                return false;
            }

            return true;
        },

        //Method to render the list of saved entries
        renderList: function() {
            var that = this;
            var data = that.database.notesDataArray;
            //Empty list
            $(".listContainer").html("");

            if (data.data.length > 0) {
                $.ajax({
                    url: "views/list_item.tmpl.html",
                    success: function(source) {
                        template = Handlebars.compile(source);
                        $(".listContainer").html(template(data));
                        $(".listContainer").listview("refresh");
                        $("body").trigger("create");
                    },
                    async: false
                });
            } else {
                //No data in the list, hide the clear all button
                $("#clearAllData").hide();
                $("#clearAllData").hide();
            }

        },

        //Method to delete 
        deleteItem: function(id) {
            var that = this;
            var index = that.database.getItemIndex(id);
            if (index != -1) {
                that.database.notesDataArray.data.splice(index, 1);
                that.database.saveData();
            }

            app.changePage("listPage");

            orga.logger.log(id, "delete");
        },

        /**
         * Database Object
         */
        database: {
            IS_DATABASE_PRESENT: "is_db_present",

            CONTENT_DATA: "content_data",

            REG_ID_KEY: "reg_id",

            notesDataArray: {
                data: []
            },

            noteDataFormat: {
                id: null,
                timeStamp: null,
                title: null,
                notes: null
            },

            init: function() {
                var that = this;
                if (that.getLocalItem(that.IS_DATABASE_PRESENT)) {
                    that.notesDataArray = that.getLocalItem(that.CONTENT_DATA);
                }
            },

            storeRegId: function(id) {
                var that = this;
                var fetchedId = that.getLocalItem(that.REG_ID_KEY);
                if (fetchedId) {
                    config.appId = fetchedId;
                } else {
                    that.setLocalItem(that.REG_ID_KEY, id);
                    config.appId = id;
                }
            },

            saveData: function() {
                var that = this;
                that.setLocalItem(that.CONTENT_DATA, that.notesDataArray);
                orga.sync.updateSyncStatus(orga.sync.SYNC_STATUS_LOCAL);
            },

            saveNewNote: function(timeStamp, title, notes, previousId) {
                var that = this;
                var note = (JSON.parse(JSON.stringify(that.noteDataFormat)));
                note.id = new Date().getTime();
                note.timeStamp = timeStamp;
                note.title = title;
                note.notes = notes;

                if (previousId == undefined) {
                    that.notesDataArray.data.push(note);
                    orga.logger.log(note.id, "new");
                } else {
                    //old entry so update it
                    note.id = previousId;
                    that.notesDataArray.data[that.getItemIndex(previousId)] = note;
                    orga.logger.log(note.id, "update");
                }


                //Save data
                that.saveData();
            },

            clearSavedNotes: function() {
                var that = this;
                that.notesDataArray.data = [];
                that.setLocalItem(that.IS_DATABASE_PRESENT, false);
                //Save data
                that.saveData();
            },

            getLocalItem: function(key) {
                var that = this;
                if (key === that.IS_DATABASE_PRESENT || key === that.REG_ID_KEY) {
                    return window.localStorage.getItem(key, false);
                } else {
                    return JSON.parse(window.localStorage.getItem(key));
                }

            },

            setLocalItem: function(key, value) {
                var that = this;
                try {
                    if (key === that.CONTENT_DATA) {
                        window.localStorage.setItem(that.IS_DATABASE_PRESENT, true);
                        window.localStorage.setItem(key, JSON.stringify(value));
                    } else {
                        window.localStorage.setItem(key, value);
                    }
                } catch (e) {
                    alert("We had an issue saving the data locally..");
                }

            },

            getItemIndex: function(id) {
                var that = this;
                for (i = 0; i < that.notesDataArray.data.length; i++) {
                    if (that.notesDataArray.data[i]['id'] == id) { //DO not use === as local store saved everything as strings
                        return i;
                    }
                }
                return -1;
            },

        },

        /**
         * Sync section to interact with web services
         */
        sync: {
            SYNC_STATUS_REMOTE: "sync_status_key_remote",

            SYNC_STATUS_LOCAL: "sync_status_key_local",

            getStatus: function(doPull, doPush) {
                var url = config.baseUrl + "?appaction=status&appname=" + config.appName + "&appid=" + config.appId;
                $.ajax({
                    url: url,
                    type: 'GET',
                    crossDomain: true, // enable this
                    dataType: 'json',
                    success: function(data) {
                        if (doPull == undefined && doPush == undefined) {
                            alert(JSON.stringify(data));
                        } else {
                            if (data.data.constructor === Array) {
                                var value = data.data.OZINDEX.split("-")[0];
                                orga.sync.setLocalItem(orga.sync.SYNC_STATUS_REMOTE, value);

                                if (doPull != undefined) {
                                    orga.sync.getData();
                                } else if (doPush != undefined) {
                                    orga.sync.pushData(orga.database.noteDataFormat);
                                }
                            }

                        }

                    },
                    error: function() {
                        alert('Failed!');
                    }
                });
            },

            updateSyncStatus: function(key, value) {
                var that = this;
                if (value == undefined) {
                    var date = new Date();
                    var uniqueId = date.getFullYear() + "" + date.getMonth() + "" + date.getDate() + "" + date.getHours();
                    uniqueId += date.getMinutes() + "" + date.getSeconds();
                    that.setLocalItem(key, uniqueId);
                } else {
                    that.setLocalItem(key, value);
                }
            },

            getData: function() {
                var url = config.baseUrl + "?appaction=request&appname=" + config.appName + "&appid=" + config.appId;

                $.ajax({
                    url: url,
                    type: 'GET',
                    crossDomain: true, // enable this
                    dataType: 'json',
                    success: function(data) {
                        orga.sync.checkLocalData(data);
                        alert(JSON.stringify(data));
                    },
                    error: function() {
                        alert('Failed!');
                    }
                });
            },

            pushData: function(appData) {
                var url = config.baseUrl + "?appaction=push&appname=" + config.appName + "&appid=" + config.appId;
                url += "&appdata=" + encodeURIComponent(JSON.stringify(appData));

                $.ajax({
                    url: url,
                    type: 'GET',
                    crossDomain: true, // enable this
                    dataType: 'json',
                    success: function(data) {
                        orga.sync.updateSyncStatus(orga.sync.SYNC_STATUS_REMOTE);
                        alert(JSON.stringify(data));
                    },
                    error: function() {
                        alert('Failed!');
                    }
                });
            },

            checkLocalData: function(data) {
                var that = this;
                var localStatus = that.getLocalItem(that.SYNC_STATUS_LOCAL);
                var remoteStatus = that.getLocalItem(that.SYNC_STATUS_REMOTE);

                if (remoteStatus > localStatus) {
                    //Update local data
                    orga.database.notesDataArray = JSON.parse(orga.sync.extractDataFromPull(remoteStatus, data.data.lines));
                    orga.database.saveData();
                }
            },

            extractDataFromPull: function(key, data) {
                for (i = 0; i < data.length; i++) {
                    var objKey = data[i].OZINDEX.split("-")[0];
                    if (objKey == key) {
                        return data[i].OZAPPDATA;
                    }
                }
            },

            getLocalItem: function(key) {
                return window.localStorage.getItem(key, null);
            },

            setLocalItem: function(key, value) {
                var that = this;

                try {
                    window.localStorage.setItem(key, value);
                } catch (e) {
                    alert("We had an issue saving the data locally..");
                }
            },
        },

        /**
         *Logger method
         */
        logger: {
            IS_DATABASE_PRESENT: "is_log_db_present",

            CONTENT_DATA_KEY: "log_data",

            logsDataArray: {
                data: []
            },

            logDataFormat: {
                id: null,
                type: null,
                timestamp: null
            },

            init: function() {
                var that = this;
                if (that.getLocalItem(that.IS_DATABASE_PRESENT)) {
                    that.logsDataArray = that.getLocalItem(that.CONTENT_DATA_KEY);
                }
            },

            renderLogsList: function() {
                var that = this;
                var data = that.logsDataArray;
                //Empty list
                $(".loglistContainer").html("");

                if (data.data.length > 0) {
                    $.ajax({
                        url: "views/loglist_item.tmpl.html",
                        success: function(source) {
                            template = Handlebars.compile(source);
                            $(".loglistContainer").html(template(data));
                            $(".loglistContainer").listview("refresh");
                            $("body").trigger("create");
                        },
                        async: false
                    });
                }

            },

            saveData: function() {
                var that = this;
                that.setLocalItem(that.CONTENT_DATA_KEY, that.logsDataArray);
            },

            log: function(id, type) {
                var that = this;
                var logData = JSON.parse(JSON.stringify(that.logDataFormat));
                logData.id = id;
                logData.type = type;
                logData.timestamp = (new Date()).getTime();

                that.logsDataArray.data.push(logData);

                //Save data
                that.saveData();
            },

            getLocalItem: function(key) {
                var that = this;
                if (key === that.IS_DATABASE_PRESENT) {
                    return window.localStorage.getItem(key, false);
                } else {
                    return JSON.parse(window.localStorage.getItem(key));
                }
            },

            setLocalItem: function(key, value) {
                var that = this;
                try {

                    if (key === that.CONTENT_DATA_KEY) {
                        window.localStorage.setItem(that.IS_DATABASE_PRESENT, true);
                        window.localStorage.setItem(key, JSON.stringify(value));
                    } else {
                        window.localStorage.setItem(key, value);
                    }
                } catch (e) {
                    alert("We had an issue saving the data locally..");
                }

            }
        }
    };
};
