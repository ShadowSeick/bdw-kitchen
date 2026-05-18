import { Recipe } from "./recipe";

enum CALENDARS {
  WEEK = "week",
}

enum DAY {
  MONDAY = "monday",
  TUESDAY = "tuesday",
  WEDNESDAY = "wednesday",
  THURSDAY = "thursday",
  FRIDAY = "friday",
  SATURDAY = "saturday",
  SUNDAY = "sunday",
}

// This is the VIEW representation. CRDTs will be used in the repository to make them work as the "persistance layer"
// In reality, 2 things will happen. We will be using CRDTs for sharing and reconciling the conflicts and the actual persistance layer
// in SQLlite which will reflect the merged and final view.
// How can I do it? I think I would need 2 repositories, 1 for the crdt and another for the sqlite. I would need a service that will act as
// the joiner of both and this is the actual thing it is called. This is my business at the end.
class Calendar {
  public weekdays: Recipe[][] = [];
  constructor() {
    this.weekdays = [];
  }
}

export { Calendar, DAY, CALENDARS };
