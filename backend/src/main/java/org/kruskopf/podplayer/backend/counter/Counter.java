package org.kruskopf.podplayer.backend.counter;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

/**
 * Minimal walking-skeleton entity representing a single global counter.
 * The row is a singleton identified by a fixed id of {@code 1}.
 */
@Entity
public class Counter {

    @Id
    private Long id = 1L;

    private int count = 0;

    public Counter() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public int getCount() {
        return count;
    }

    public void setCount(int count) {
        this.count = count;
    }
}
