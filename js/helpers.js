//Handle bars helper list
//Notes
Handlebars.registerHelper('stringDate', function(timestamp) {
    var string = "";
    var date = new Date(timestamp);
    string = date.getFullYear() + "/" + (date.getMonth() + 1) + "/" + date.getDate();
    return new Handlebars.SafeString(string);
});

Handlebars.registerHelper('stringFullDate', function(timestamp) {
    var string = "";
    var date = new Date(parseInt(timestamp));
    string = date.getFullYear() + "/" + (date.getMonth() + 1) + "/" + date.getDate() + " ";
    string += date.getHours() + ":" + date.getMinutes();
    return new Handlebars.SafeString(string);
});
